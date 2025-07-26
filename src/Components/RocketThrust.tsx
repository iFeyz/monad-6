import * as THREE from "three"
import { useRef, useEffect, useState } from "react"
import { useFrame, createPortal } from "@react-three/fiber"
import { useControls, folder } from "leva"
import { useGLTF } from "@react-three/drei"

const vertexShader = `
    uniform float model_height;
    varying float vert_height;
    varying vec2 v_uv;
    varying vec3 v_normal;
    varying vec3 v_worldPosition;
    varying vec3 v_viewPosition;

    void main() {
        // Inverser la hauteur : 0 = sommet, 1 = base
        v_normal = normalize(normalMatrix * normal);
        vert_height = 1.0 - (position.y + (model_height / 2.0)) / model_height;
        v_uv = uv;
        
        // Position dans l'espace monde et vue
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        v_worldPosition = worldPosition.xyz;
        v_viewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = `
    uniform float dissolve_start;
    uniform float dissolve_length;
    uniform float gradient_bias;
    uniform float noise_speed;
    uniform float noise_strength;
    uniform float stretch_factor;
    uniform float noise_scale;
    uniform float power_factor;
    uniform vec3 flame_color;
    uniform float uTime;
    uniform float fresnel_factor;
    uniform float fresnel_amplification;
    uniform float fresnel_power;
    uniform float fresnel_bias;
    uniform vec3 u_cameraPosition;
    
    varying float vert_height;
    varying vec2 v_uv;
    varying vec3 v_normal;
    varying vec3 v_worldPosition;
    varying vec3 v_viewPosition;

    // Simplex 3D Noise par Ian McEwan, Stefan Gustavson
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 =   v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1. + 3.0 * C.xxx;

        // Permutations
        i = mod(i, 289.0 ); 
        vec4 p = permute( permute( permute( 
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        // Normalize gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                      dot(p2,x2), dot(p3,x3) ) );
    }

    // Fonction neon pour intensifier les couleurs de flamme
    vec3 neon(float value, vec3 color) {
        float ramp = clamp(value, 0.0, 1.0);
        vec3 output_color = vec3(0.0);
        ramp = ramp * ramp;
        output_color += pow(color, vec3(4.0)) * ramp;
        ramp = ramp * ramp;
        output_color += color * ramp;
        ramp = ramp * ramp;
        output_color += vec3(1.0) * ramp;
        return output_color;
    }

    // Fractional Brownian Motion lissé
    float fbm(vec3 x) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        // Matrice de rotation pour éviter les artefacts directionnels
        const mat3 rot = mat3(0.00,  0.80,  0.60,
                              -0.80, 0.36, -0.48,
                              -0.60, -0.48, 0.64);
        for (int i = 0; i < 5; ++i) {
            v += a * snoise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.5;
        }
        return v * 0.5 + 0.5; // Normaliser entre 0 et 1
    }

    // Fonction de lissage pour éviter les discontinuités
    float smoothNoise(vec3 pos) {
        return (fbm(pos) + fbm(pos + vec3(0.1, 0.1, 0.1))) * 0.5;
    }

    // Fresnel amélioré avec bias pour éviter la disparition complète
    float improvedFresnel(float amount, vec3 normal, vec3 view, float bias) {
        float fresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(view)), 0.0, 1.0), amount);
        // Ajouter un bias pour s'assurer qu'il y a toujours une visibilité minimale
        return clamp(fresnel + bias, bias, 1.0);
    }

    void main() {
        float time = uTime * noise_speed;
        
        // Coordonnées avec interpolation plus douce
        vec2 smoothUV = smoothstep(0.0, 1.0, v_uv);
        vec3 pos = vec3(
            smoothUV.x * noise_scale, 
            (smoothUV.y * stretch_factor + time) * noise_scale, 
            time * 0.3
        );
        
        // Bruit multi-échelle lissé
        float noise1 = smoothNoise(pos) - 0.5;
        float noise2 = smoothNoise(pos * 2.0 + vec3(100.0)) * 0.5 - 0.25;
        float noise3 = smoothNoise(pos * 4.0 + vec3(200.0)) * 0.25 - 0.125;
        
        float noise_value = (noise1 + noise2 + noise3) * noise_strength;
        
        // Gradient plus doux
        float gradient_height = vert_height - dissolve_start;
        gradient_height *= 1.0 / max(dissolve_length, 0.001); // Éviter division par 0
        gradient_height = clamp(pow(max(gradient_height, 0.0), gradient_bias) + noise_value, 0.0, 1.0);
        
        // Alpha avec transition plus douce
        float alpha = smoothstep(1.0, 0.0, gradient_height);
        
        // Application de la fonction neon avec la couleur personnalisée
        vec3 final_color = neon(pow(alpha, power_factor), flame_color);
        
        // Rendre les parties très sombres transparentes pour un meilleur rendu
        float luminance = dot(final_color, vec3(0.299, 0.587, 0.114));
        alpha *= smoothstep(0.0, 0.1, luminance);

        // Calcul du vecteur vue corrigé
        vec3 normal = normalize(v_normal);
        vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);

        // Effet fresnel amélioré avec bias
        float fresnelEffect = improvedFresnel(fresnel_factor, normal, viewDir, fresnel_bias);
        fresnelEffect = pow(fresnelEffect * fresnel_amplification, fresnel_power);

        // Multiplier l'alpha pour adoucir les bords
        alpha *= fresnelEffect;
        gl_FragColor = vec4(final_color, alpha);
    }
`

export default function RocketThrust() {
    const { nodes, scene } = useGLTF('/space.glb')
    const meshRef = useRef()
    const shaderMaterialRef = useRef()
    
    // State for dynamic values controlled by keyboard
    const [dynamicNoiseSpeed, setDynamicNoiseSpeed] = useState(3.1)
    const [dynamicCylinderHeight, setDynamicCylinderHeight] = useState(3.3)
    const [isZPressed, setIsZPressed] = useState(false)
    const pressStartTimeRef = useRef(0)
    
    // Base values from controls
    const baseNoiseSpeedRef = useRef(3.1)
    const baseCylinderHeightRef = useRef(3.3)
    
    // Utiliser des refs pour les uniforms pour éviter les recréations d'objets
    const uniformsRef = useRef({
        model_height: { value: 2 },
        dissolve_start: { value: 0.001 },
        dissolve_length: { value: 1.0 },
        gradient_bias: { value: 1.0 },
        noise_speed: { value: 3.1 },
        noise_strength: { value: 0.3 },
        stretch_factor: { value: 3.0 },
        noise_scale: { value: 4.0 },
        power_factor: { value: 2.0 },
        flame_color: { value: new THREE.Color("#ff4500") },
        uTime: { value: 0 },
        fresnel_factor: { value: 1.0 },
        fresnel_amplification: { value: 1.0 },
        fresnel_power: { value: 6.0 },
        fresnel_bias: { value: 0.3 }, // Nouveau paramètre pour éviter la disparition
        u_cameraPosition: { value: new THREE.Vector3() }
    })

    const { 
        targetNodeName,
        baseRadius,
        topRadius,
        cylinderHeight,
        radialSegments,
        heightSegments,
        dissolve_start, 
        dissolve_length, 
        gradient_bias,
        noise_speed,
        noise_strength,
        stretch_factor,
        noise_scale,
        power_factor,
        flame_color,
        fresnel_bias
    } = useControls({
        // Target Node Selection
        "Target Node": folder({
            targetNodeName: {
                value: "Bone003_04",
                options: [
                    "Bone003_04",
                    "Bone001_02", 
                    "Bone002_03",
                    "Bone004_05",
                    "Bone005_06",
                    "Bone006_07",
                    "Bone007_08",
                    "Bone008_09"
                ]
            }
        }),
        // Géométrie du cylindre tronqué
        "Geometry": folder({
            baseRadius: {
                value: 0.1,
                min: 0.1,
                max: 10,
                step: 0.1
            },
            topRadius: {
                value: 0.8,
                min: 0.1,
                max: 5,
                step: 0.1
            },
            cylinderHeight: {
                value: 1.3,
                min: 0.1,
                max: 100,
                step: 0.1,
                onChange: (value) => {
                    baseCylinderHeightRef.current = value
                    if (!isZPressed) {
                        setDynamicCylinderHeight(value)
                    }
                }
            },
            radialSegments: {
                value: 92,
                min: 8,
                max: 128,
                step: 1
            },
            heightSegments: {
                value: 14,
                min: 1,
                max: 100,
                step: 1
            }
        }),
        // Effet de dissolution
        "Dissolve Effect": folder({
            dissolve_start: {
                value: 0.26,
                min: 0.0,
                max: 1.0,
                step: 0.001,
                onChange: (value) => {
                    uniformsRef.current.dissolve_start.value = value
                }
            },
            dissolve_length: {
                value: 1.0,
                min: 0.0,
                max: 1.0,
                step: 0.01,
                onChange: (value) => {
                    uniformsRef.current.dissolve_length.value = value
                }
            },
            gradient_bias: {
                value: 0.9,
                min: 0.1,
                max: 5.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.gradient_bias.value = value
                }
            }
        }),
        // Bruit et animation
        "Noise & Animation": folder({
            noise_speed: {
                value: 3.1,
                min: 0.0,
                max: 10.0,
                step: 0.1,
                onChange: (value) => {
                    baseNoiseSpeedRef.current = value
                    if (!isZPressed) {
                        setDynamicNoiseSpeed(value)
                        uniformsRef.current.noise_speed.value = value
                    }
                }
            },
            noise_strength: {
                value: 0.21,
                min: 0.0,
                max: 1.0,
                step: 0.01,
                onChange: (value) => {
                    uniformsRef.current.noise_strength.value = value
                }
            },
            stretch_factor: {
                value: 0.9,
                min: 0.1,
                max: 10.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.stretch_factor.value = value
                }
            },
            noise_scale: {
                value: 2.3,
                min: 0.1,
                max: 20.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.noise_scale.value = value
                }
            }
        }),
        // Effets visuels
        "Visual Effects": folder({
            power_factor: {
                value: 1.6,
                min: 0.1,
                max: 5.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.power_factor.value = value
                }
            },
            flame_color: {
                value: "#a600ff",
                onChange: (value) => {
                    uniformsRef.current.flame_color.value = new THREE.Color(value)
                }
            },
            fresnel_factor: {
                value: 4.5,
                min: 0.1,
                max: 10.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.fresnel_factor.value = value
                }
            },
            fresnel_amplification: {
                value: 1.0,
                min: 0.1,
                max: 10.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.fresnel_amplification.value = value
                }
            },
            fresnel_power: {
                value: 0.1,
                min: 0.1,
                max: 10.0,
                step: 0.1,
                onChange: (value) => {
                    uniformsRef.current.fresnel_power.value = value
                }
            },
            fresnel_bias: {
                value: 0.38,
                min: 0.0,
                max: 1.0,
                step: 0.01,
                onChange: (value) => {
                    uniformsRef.current.fresnel_bias.value = value
                }
            }
        })
    })

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key.toLowerCase() === 'w' && !isZPressed) {
                setIsZPressed(true)
                pressStartTimeRef.current = performance.now()
            }
        }

        const handleKeyUp = (event) => {
            if (event.key.toLowerCase() === 'w') {
                setIsZPressed(false)
                // Reset to base values
                setDynamicNoiseSpeed(baseNoiseSpeedRef.current)
                setDynamicCylinderHeight(baseCylinderHeightRef.current)
                uniformsRef.current.noise_speed.value = baseNoiseSpeedRef.current
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [isZPressed])

    useFrame((state) => {
        // Mise à jour du temps et de la position de la caméra
        uniformsRef.current.uTime.value = state.clock.elapsedTime
        uniformsRef.current.u_cameraPosition.value.copy(state.camera.position)
        
        // Handle Z key continuous press
        if (isZPressed) {
            const currentTime = performance.now()
            const pressDuration = (currentTime - pressStartTimeRef.current) / 1000 // Convert to seconds
            
            // Slower increase rates for more controlled effect
            const speedMultiplier = 1 + (pressDuration * 0.1) // Increase speed by 0.8x per second (reduced from 2x)
            const heightMultiplier = 1 + (pressDuration * 0.2) // Increase height by 0.2x per second (reduced from 0.5x)
            const baseCylinderHeight = 1.5 
            
            const newNoiseSpeed = baseNoiseSpeedRef.current * speedMultiplier
            const newCylinderHeight = baseCylinderHeightRef.current * heightMultiplier
            
            // Stricter caps for maximum values
            const maxNoiseSpeed = Math.min(baseNoiseSpeedRef.current * 10, 15.0) // Max 3x base value or absolute max 15.0
            const maxCylinderHeight = Math.min(baseCylinderHeightRef.current * 1.2, 20.0) // Max 2.5x base value or absolute max 20.0
            
            setDynamicNoiseSpeed(Math.min(newNoiseSpeed, maxNoiseSpeed))
            setDynamicCylinderHeight(Math.min(newCylinderHeight, maxCylinderHeight))
            
            uniformsRef.current.noise_speed.value = Math.min(newNoiseSpeed, maxNoiseSpeed)
        }
    })

    // Debug: Log available nodes to help identify the correct node name
    useEffect(() => {
        if (nodes) {
            console.log('Available nodes:', Object.keys(nodes))
        }
    }, [nodes])

    // Check if the target node exists before rendering the portal
    const targetNode = nodes?.[targetNodeName]

    return (
        <group>
            <primitive object={scene.clone()} scale={[0.08, 0.1, 0.1]} rotation={[0, Math.PI / 2, 0]} />
            {targetNode && createPortal(
                <mesh ref={meshRef} scale={[3, 30, 3]} position={[0, -24.5, -30]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[topRadius, baseRadius, dynamicCylinderHeight, radialSegments, heightSegments, true]} />
                    <shaderMaterial
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniformsRef.current}
                        transparent={true}
                        side={THREE.FrontSide}
                        depthWrite={false}
                        blending={THREE.NormalBlending}
                    />
                </mesh>,
                targetNode
            )}
                        {targetNode && createPortal(
                <mesh ref={meshRef} scale={[3, 25, 3]} position={[0, -24.5, -30]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[topRadius, baseRadius, dynamicCylinderHeight, radialSegments, heightSegments, true]} />
                    <shaderMaterial
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniformsRef.current}
                        transparent={true}
                        side={THREE.FrontSide}
                        depthWrite={false}
                        blending={THREE.NormalBlending}
                    />
                </mesh>,
                targetNode
            )}
            {targetNode && createPortal(
                <mesh ref={meshRef} scale={[3, 30, 3]} position={[-2, -34.2, -20]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[topRadius, baseRadius, dynamicCylinderHeight, radialSegments, heightSegments, true]} />
                    <shaderMaterial
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniformsRef.current}
                        transparent={true}
                        side={THREE.FrontSide}
                        depthWrite={false}
                        blending={THREE.NormalBlending}
                    />
                </mesh>,
                targetNode
            )}
            {targetNode && createPortal(
                <mesh ref={meshRef} scale={[3, 30, 3]} position={[-2, -15, -20]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[topRadius, baseRadius, dynamicCylinderHeight, radialSegments, heightSegments, true]} />
                    <shaderMaterial
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniformsRef.current}
                        transparent={true}
                        side={THREE.FrontSide}
                        depthWrite={false}
                        blending={THREE.NormalBlending}
                    />
                </mesh>,
                targetNode
            )}
        </group>
    )
}