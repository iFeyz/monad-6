import { Environment, useGLTF, Text, Text3D, Center } from "@react-three/drei"
import CameraSwitcher from "./CameraSwitcher"
import { PlayersManager } from "./PlayersManager"
import { Physics, RigidBody } from "@react-three/rapier"
import ShipManager from "./ShipManager"
import { ProceduralPlanet } from "./ProceduralPlanet"
import { ProceduralGalaxy } from "./GalaxyGeneration"
import spaceCraft from "/spaceCraft.glb?url"
import spaceCraft2 from "/spaceCraft2.glb?url"
import { useRef } from "react"
import { InteractiveObjects } from "./InteractiveObjects"
import { InteractionManager } from "./InteractionManager"
import { useTexture } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from 'three'

const vertexShader = /*glsl*/ `
    out vec3 vView;
    out vec3 vNormal;
    out vec2 vUv;
    uniform sampler2D uHologramTexture;
    uniform sampler2D uFlickerTexture;
    uniform vec2 uOffset;
    uniform vec2 uRepeat;
    uniform vec2 uSpeed;
    uniform float uTime;
    uniform float uDisplacementStrength;
    uniform float uDisplacementLerp;
    uniform float uBreathIntensity;
    uniform float uFlickerSpeed;
    uniform float uFlickerInMin;
    uniform float uFlickerInMax;
    uniform float uFlickerOutMin;
    uniform float uFlickerOutMax;

    void main()
    {
        vUv = uv;
        
        vec2 animatedOffset = uOffset + (uSpeed * uTime);
        vec2 samplingUv = (uv * uRepeat) + animatedOffset;
        samplingUv = fract(samplingUv);
        
        vec4 hologramTextureColor = textureLod( uHologramTexture, samplingUv, 0.0 );
        
        vec2 flickerUv = vec2(uTime * uFlickerSpeed);
        flickerUv = fract(flickerUv);
        vec4 flickerTexture = textureLod( uFlickerTexture, flickerUv, 0.0 );
        
        float flickerValue = flickerTexture.r;
        flickerValue = clamp((flickerValue - uFlickerInMin) / (uFlickerInMax - uFlickerInMin), 0.0, 1.0);
        flickerValue = mix(uFlickerOutMin, uFlickerOutMax, flickerValue);
        
        float breath = sin(uTime * uBreathIntensity) * 0.5 + 0.5;
        
        float baseDisplacement = hologramTextureColor.r * uDisplacementStrength;
        float synchronizedDisplacement = baseDisplacement * breath * flickerValue;
        
        vec3 originalPosition = position;
        vec3 displacedPosition = position + normal * synchronizedDisplacement;
        vec3 finalPosition = mix(originalPosition, displacedPosition, uDisplacementLerp);
        
        vec3 objectPosition = ( modelMatrix * vec4( finalPosition, 1.0 ) ).xyz;
        vView = normalize( cameraPosition - objectPosition );
        vNormal = normalize( ( modelMatrix * vec4( normal, 0.0 ) ).xyz );

        gl_Position = projectionMatrix * modelViewMatrix * vec4( finalPosition, 1.0 );
    }
`

const fragmentShader = /*glsl*/ `
    uniform vec3 uFresnelColor;
    uniform vec3 uBaseColor;
    uniform float uFresnelAmt;
    uniform float uFresnelOffset;
    uniform float uFresnelIntensity;
    uniform float uFresnelAlpha;
    uniform sampler2D uHologramTexture;
    uniform sampler2D uFlickerTexture;
    uniform vec2 uOffset;
    uniform vec2 uRepeat;
    uniform vec2 uSpeed;
    uniform float uTime;
    uniform float uBreathIntensity;
    uniform float uTextureOpacity;
    uniform float uFlickerIntensity;
    uniform float uFlickerSpeed;
    uniform float uFlickerInMin;
    uniform float uFlickerInMax;
    uniform float uFlickerOutMin;
    uniform float uFlickerOutMax;
    uniform float uVerticalSpeed;
    uniform float uGlowIntensity;

    in vec3 vView;
    in vec3 vNormal;
    in vec2 vUv;

    float lambertLighting( vec3 normal, vec3 viewDirection )
    {
        return max( dot( normal, viewDirection ), 0.0 );
    }

    float fresnelFunc( float amount, float offset, vec3 normal, vec3 view)
    {   
        float fresnel = offset + ( 1.0 - offset ) * pow( 1.0 - dot( normal , view ), amount );
        return fresnel;
    }

    void main()
    {
        float fresnel = fresnelFunc( uFresnelAmt, uFresnelOffset, vNormal, vView );
        vec3 fresnelColor = ( uFresnelColor * fresnel ) * uFresnelIntensity;

        float diffuse = lambertLighting( vNormal, vView );
        vec3 diffuseColor = vec3(0.0);

        vec2 animatedOffset = uOffset + (uSpeed * uTime);
        animatedOffset.y += uTime * uVerticalSpeed;
        
        vec2 uv = (vUv * uRepeat) + animatedOffset;
        uv = fract(uv);
        vec4 hologramTextureColor = texture2D( uHologramTexture, uv );

        vec2 flickerUv = vec2(uTime * uFlickerSpeed);
        flickerUv = fract(flickerUv);
        vec4 flickerTexture = texture2D( uFlickerTexture, flickerUv );
        
        float flickerValue = flickerTexture.r;
        flickerValue = clamp((flickerValue - uFlickerInMin) / (uFlickerInMax - uFlickerInMin), 0.0, 1.0);
        flickerValue = mix(uFlickerOutMin, uFlickerOutMax, flickerValue);

        float breath = sin(uTime * uBreathIntensity) * 0.4 + 0.6;
        vec3 breathColor = hologramTextureColor.rgb * breath;

        vec3 finalColor = fresnelColor;
        finalColor = mix( finalColor, breathColor, breath * uTextureOpacity );
        finalColor = mix(finalColor, finalColor * flickerValue, uFlickerIntensity);
        finalColor *= uGlowIntensity;

        float alpha = fresnel;

        gl_FragColor = vec4( finalColor, alpha );
    }
`

export const Scene = () => {
    const spaceRigibBody = useRef<any>(null)
    
    // Hologram textures
    const hologramTexture = useTexture('/textures/hologram.png')
    const flickerTexture = useTexture('/textures/noise.png')

    const space = useGLTF(spaceCraft)
    const space2 = useGLTF(spaceCraft2)

    // Hologram uniforms
    const uniformsRef = useRef({
        uFresnelColor: { value: new THREE.Color('#a855f7') }, // Purple color from config
        uBaseColor: { value: new THREE.Color('#fefefe') },
        uFresnelAmt: { value: 0.54 },
        uFresnelOffset: { value: 0.05 },
        uFresnelIntensity: { value: 1 },
        uFresnelAlpha: { value: 1 },
        uHologramTexture: { value: hologramTexture },
        uFlickerTexture: { value: flickerTexture },
        uTextureOpacity: { value: 0.1 },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uRepeat: { value: new THREE.Vector2(1, 1) },
        uSpeed: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uBreathIntensity: { value: 7.0 },
        uDisplacementStrength: { value: 0.9 },
        uDisplacementLerp: { value: 0.7 },
        uFlickerIntensity: { value: 0.3 },
        uFlickerSpeed: { value: 1.0 },
        uFlickerInMin: { value: 0.0 },
        uFlickerInMax: { value: 1.0 },
        uFlickerOutMin: { value: 0.5 },
        uFlickerOutMax: { value: 1.5 },
        uVerticalSpeed: { value: 0.1 },
        uGlowIntensity: { value: 1.0 }
    })

    useFrame(() => {
        uniformsRef.current.uTime.value += 0.01
    })

    return (
        <> 

            <>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 100, 10]} intensity={0.8} />
                <directionalLight position={[50, 50, 50]} intensity={0.5} />
                <Environment preset="night" />
            </>

            <Physics gravity={[0, -10, 0]}>
                {/* 3D Space Monad Text with Hologram Effect */}
                <Center position={[0, 50, -300]}>
                    <Text3D
                        font="/fonts/helvetiker_regular.typeface.json"
                        size={50}
                        height={20}
                        curveSegments={30}
                        bevelEnabled
                        bevelThickness={1}
                        bevelSize={1}
                        bevelOffset={0}
                        bevelSegments={10}
                    >
                        SPACE 
                        MONAD
                        <shaderMaterial 
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniformsRef.current}
                        transparent={true}
                        blending={THREE.AdditiveBlending}
                    />
                    </Text3D>
                </Center>

                <RigidBody 
                    type="dynamic" 
                    colliders="trimesh" 
                    gravityScale={0} 
                    enabledRotations={[true, true, true]} 
                    enabledTranslations={[true, true, true]} 
                    ref={spaceRigibBody}
                    canSleep={false}
                >
                    <group position={[-200, 300, 300]} scale={100}>
                        <primitive object={space.scene.clone()} />
                    </group>
                </RigidBody>
                <RigidBody 
                    type="fixed" 
                    colliders="trimesh" 
                    gravityScale={0} 
                    enabledRotations={[true, true, true]} 
                    enabledTranslations={[true, true, true]} 
                    ref={spaceRigibBody}
                    canSleep={false}
                >
            
                
                <group position={[0, -8.8, -20]} scale={0.5}>
                    <primitive object={space2.scene.clone()} />
                </group>
                </RigidBody>

           
                <PlayersManager/>
                <ShipManager/>
                <CameraSwitcher/>
                
                <InteractionManager />
                <InteractiveObjects/>
        
                <ProceduralPlanet/>
                <ProceduralGalaxy/>
            </Physics>
        </>
    )
}