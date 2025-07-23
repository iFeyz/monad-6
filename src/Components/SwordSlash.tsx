import React, { useMemo, useRef, useState, useCallback } from 'react'
import { useLoader, useFrame, createPortal } from '@react-three/fiber'
import { useTexture, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import * as THREE from 'three'

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader for slash effect
const fragmentShader = `
  uniform sampler2D slashTexture;
  uniform sampler2D baseNoise;
  uniform float time;
  uniform vec3 color;
  uniform float erosionAmount;
  uniform vec3 erosionColor;
  uniform vec2 textureOffset;
  uniform float zoom;
  uniform float rotateAll;
  uniform float emissionStrength;
  uniform float mixStrength;
  
  varying vec2 vUv;
  
  #define PI 3.1415926535897932384626433832795
  
  vec2 polarCoordinates(vec2 uv, vec2 center, float zoomVal, float repeat) {
    vec2 dir = uv - center;
    float radius = length(dir) * 2.0;
    float angle = atan(dir.y, dir.x) * 1.0 / (PI * 2.0);
    return mod(vec2(radius * zoomVal, angle * repeat), 1.0);
  }
  
  vec2 rotate(vec2 uv, vec2 pivot, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 rotation = mat2(c, -s, s, c);
    uv -= pivot;
    uv = rotation * uv;
    uv += pivot;
    return uv;
  }
  
  float easeOutExpo(float x) {
    return x == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
  }
  
  float easeInExpo(float x) {
    return x == 0.0 ? 0.0 : pow(2.0, 10.0 * x - 10.0);
  }
  
  float easeInOut(float x) {
    if (x < 0.5) {
      return (1.0 - sqrt(1.0 - pow(2.0 * x, 2.0))) / 2.0;
    } else {
      return (sqrt(1.0 - pow(-2.0 * x + 2.0, 2.0)) + 1.0) / 2.0;
    }
  }
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    float p = easeOutExpo(time);
    
    vec2 rotatedUV = rotate(vUv, vec2(0.5), radians(rotateAll));
    vec2 aUV = polarCoordinates(rotatedUV, vec2(0.5), zoom, 1.0);
    
    vec2 animatedUv = aUV + vec2(0.0, p) + textureOffset;
    vec4 textureSample = texture2D(slashTexture, animatedUv);
    vec4 baseNoiseValue = texture2D(baseNoise, animatedUv);
    
    float baseMask = 1.0 - textureSample.r;
    
    vec2 widthUV = aUV;
    float widthMask = smoothstep(0.2, 0.8, abs(widthUV.y - 0.5) * 2.0);
    
    vec2 lengthUV = rotate(aUV - vec2(0.0, easeInOut(p)), vec2(0.5), radians(180.0));
    float lengthMask = smoothstep(0.3, 0.7, lengthUV.x);
    
    float combinedMask = (baseMask + baseNoiseValue.r - widthMask) - lengthMask;
    
    vec2 noiseUv1 = animatedUv * 8.0;
    vec2 noiseUv2 = animatedUv * 16.0;
    float noiseValue1 = noise(noiseUv1);
    float noiseValue2 = noise(noiseUv2) * 0.5;
    float finalNoise = noiseValue1 + noiseValue2;
    
    float erosionMask = smoothstep(erosionAmount - 0.1, erosionAmount + 0.1, finalNoise);
    float prefinal = clamp(combinedMask * erosionMask, 0.0, 1.0);
    
    // Garantir une couleur minimale (jamais complètement noir)
    vec3 minColor = color * 0.1; // Couleur de base minimale
    vec3 finalColor = mix(minColor, color * mixStrength, prefinal);
    
    float highlight = clamp(baseNoiseValue.g - lengthMask, 0.0, 1.0);
    vec3 highlightColor = erosionColor * highlight * 0.3;
    
    // Assurer que la couleur finale n'est jamais noire
    finalColor = max(finalColor + highlightColor, minColor);
    
    float start = abs(cos(p * PI));
    float end = abs(cos(p * PI));
    float alpha = clamp(
      smoothstep(start, end, prefinal) + 
      smoothstep(clamp(start, 0.0, 0.2), clamp(end, 0.0, 0.2), highlight * 0.2), 
      0.0, 1.0
    );
    
    // Émission avec minimum garanti
    vec3 emission = finalColor * max(emissionStrength, 0.2);
    
    // Couleur finale garantie non-noire
    vec3 outputColor = max(finalColor + emission, minColor);
    
    if (alpha < 0.05) discard;
    
    gl_FragColor = vec4(outputColor, alpha);
  }
`

      const particleVertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = color;
    vAlpha = alpha;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (50.0 / -mvPosition.z); // Réduction de 300 à 50
    gl_Position = projectionMatrix * mvPosition;
  }
`

// Particle fragment shader
const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    float distance = length(gl_PointCoord - vec2(0.5));
    
    // Create a soft circular particle
    float alpha = 1.0 - smoothstep(0.3, 0.5, distance);
    alpha *= vAlpha;
    
    // Add some inner glow
    float innerGlow = 1.0 - smoothstep(0.0, 0.2, distance);
    vec3 finalColor = vColor + innerGlow * vColor * 0.5;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`

// Particle system component attaché directement au mesh slash
const SlashParticles = ({ slashGeometry, animationProgress }) => {
  const particlesRef = useRef()
  const materialRef = useRef()
  const [particles, setParticles] = useState([])
  const [initialized, setInitialized] = useState(false)
  
  // Initialize particles when animation starts
  useMemo(() => {
    if (animationProgress > 0 && !initialized && slashGeometry) {
      const newParticles = []
      const particleCount = 30
      
      // Get position attribute from slash geometry
      const positionAttribute = slashGeometry.attributes.position
      const positions = positionAttribute.array
      
      for (let i = 0; i < particleCount; i++) {
        // Pick a random vertex from the slash mesh
        const vertexIndex = Math.floor(Math.random() * (positions.length / 3)) * 3
        const baseX = positions[vertexIndex]
        const baseY = positions[vertexIndex + 1]
        const baseZ = positions[vertexIndex + 2]
        
        // Add some random offset around the vertex
        const offsetRadius = 0.05 + Math.random() * 0.15
        const offsetAngle = Math.random() * Math.PI * 2
        const offsetHeight = (Math.random() - 0.5) * 0.1
        
        const finalX = baseX + Math.cos(offsetAngle) * offsetRadius
        const finalY = baseY + offsetHeight
        const finalZ = baseZ + Math.sin(offsetAngle) * offsetRadius
        
        // Random velocity direction
        const velocityAngle = Math.random() * Math.PI * 2
        const velocityMagnitude = 0.5 + Math.random() * 1
        
        newParticles.push({
          initialPosition: new THREE.Vector3(finalX, finalY, finalZ),
          position: new THREE.Vector3(finalX, finalY, finalZ),
          velocity: new THREE.Vector3(
            Math.cos(velocityAngle) * velocityMagnitude,
            0.5 + Math.random() * 1,
            Math.sin(velocityAngle) * velocityMagnitude
          ),
          color: new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 0.8 + Math.random() * 0.2, 0.5 + Math.random() * 0.3), // Variations de violet
          size: 0.5 + Math.random() * 2,
          birthTime: Math.random() * 0.3 // Stagger spawn times
        })
      }
      
      setParticles(newParticles)
      setInitialized(true)
    }
    
    // Reset when animation ends
    if (animationProgress === 0 && initialized) {
      setParticles([])
      setInitialized(false)
    }
  }, [animationProgress, initialized, slashGeometry])
  
  // Update particles based on animation progress
  useFrame(() => {
    if (particles.length === 0 || animationProgress === 0) return
    
    const activeParticles = particles
      .map(particle => {
        const particleAge = animationProgress - particle.birthTime
        if (particleAge <= 0) return null // Not born yet
        
        const life = Math.max(0, 1 - particleAge * 2) // Fade over time
        if (life <= 0) return null
        
        // Update position based on time
        const timeStep = particleAge * 0.5
        const newPosition = particle.initialPosition.clone().add(
          particle.velocity.clone().multiplyScalar(timeStep)
        )
        // Add gravity
        newPosition.y -= 0.5 * timeStep * timeStep
        
        return {
          ...particle,
          position: newPosition,
          life: life,
          currentSize: particle.size * life
        }
      })
      .filter(particle => particle !== null)
    
    // Update geometry
    if (particlesRef.current && materialRef.current && activeParticles.length > 0) {
      const positions = new Float32Array(activeParticles.length * 3)
      const colors = new Float32Array(activeParticles.length * 3)
      const sizes = new Float32Array(activeParticles.length)
      const alphas = new Float32Array(activeParticles.length)
      
      activeParticles.forEach((particle, i) => {
        positions[i * 3] = particle.position.x
        positions[i * 3 + 1] = particle.position.y
        positions[i * 3 + 2] = particle.position.z
        
        colors[i * 3] = particle.color.r
        colors[i * 3 + 1] = particle.color.g
        colors[i * 3 + 2] = particle.color.b
        
        sizes[i] = particle.currentSize
        alphas[i] = particle.life
      })
      
      particlesRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      particlesRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      particlesRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      particlesRef.current.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
      
      particlesRef.current.attributes.position.needsUpdate = true
      particlesRef.current.attributes.color.needsUpdate = true
      particlesRef.current.attributes.size.needsUpdate = true
      particlesRef.current.attributes.alpha.needsUpdate = true
      
      // Update count
      particlesRef.current.setDrawRange(0, activeParticles.length)
    }
  })
  
  if (particles.length === 0) return null
  
  return (
    <points>
      <bufferGeometry ref={particlesRef}>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(30 * 3)} // Max particles
          count={30}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={new Float32Array(30 * 3)}
          count={30}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={new Float32Array(30)}
          count={30}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-alpha"
          array={new Float32Array(30)}
          count={30}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

const SwordSlash = ({ 
  fbxPath = "/slash.fbx", 
  swordPath = "/sword.glb",
  texturePath = "/slash.jpg" 
}) => {
  const materialRefBlanc = useRef()
  const materialRefRouge = useRef()
  const materialRefJaune = useRef()
  const materialRefParticule = useRef()
  const swordRef = useRef()
  const [bladeNode, setBladeNode] = useState(null)

  const [isAnimating, setIsAnimating] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  
  // Load FBX model (slash effect)
  const fbxModel = useLoader(FBXLoader, fbxPath)
  
  // Load GLTF sword avec useGLTF
  const { nodes, scene } = useGLTF(swordPath)
  
  // Load textures
  const slashTextureBlanc = useTexture(texturePath)
  const slashTextureRouge = useTexture(texturePath)
  const slashTextureJaune = useTexture(texturePath)
  const slashTextureParticule = useTexture(texturePath)
  const noiseTexture = useTexture('/noise.png')
  
  // Debug: Afficher tous les nodes disponibles
  useMemo(() => {
    console.log('Available nodes:', Object.keys(nodes))
    if (nodes.blade_0) {
      console.log('blade_0 found:', nodes.blade_0)
      setBladeNode(nodes.blade_0)
    } else {
      console.log('blade_0 not found, available nodes:', Object.keys(nodes))
      scene.traverse((child) => {
        console.log('Node:', child.name, child.type)
        if (child.name === 'blade_0' || child.name.includes('blade')) {
          console.log('Found blade node:', child.name)
          setBladeNode(child)
        }
      })
    }
  }, [nodes, scene])
  
  // Configure textures
  useMemo(() => {
    [slashTextureBlanc, slashTextureRouge, slashTextureJaune, slashTextureParticule].forEach(texture => {
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.flipY = false
      }
    })
  }, [slashTextureBlanc, slashTextureRouge, slashTextureJaune, slashTextureParticule])
  
  // Uniforms pour les différentes couches d'effet - Thème Violet
  const uniforms_blanc = useMemo(() => ({
    slashTexture: { value: slashTextureBlanc },
    baseNoise: { value: noiseTexture },
    time: { value: 0 },
    erosionAmount: { value: 0.3 },
    erosionColor: { value: new THREE.Color(0.6, 0.4, 0.8) }, // Violet clair
    color: { value: new THREE.Color(0.5, 0.3, 0.7) }, // Violet moyen
    textureOffset: { value: new THREE.Vector2(0.5, 0.0) },
    zoom: { value: 0.8 },
    rotateAll: { value: 0.0 },
    emissionStrength: { value: 0.8 },
    mixStrength: { value: 1.2 }
  }), [slashTextureBlanc, noiseTexture])

  const uniforms_rouge = useMemo(() => ({
    slashTexture: { value: slashTextureRouge },
    baseNoise: { value: noiseTexture },
    time: { value: 0 },
    erosionAmount: { value: 0.2 },
    erosionColor: { value: new THREE.Color(0.9, 0.6, 1.0) }, // Violet-rose brillant
    color: { value: new THREE.Color(0.7, 0.2, 0.9) }, // Violet intense
    textureOffset: { value: new THREE.Vector2(0.2, 0.0) },
    zoom: { value: 0.7 },
    rotateAll: { value: 0.0 },
    emissionStrength: { value: 0.4 },
    mixStrength: { value: 1.2 }
  }), [slashTextureRouge, noiseTexture])

  const uniforms_jaune = useMemo(() => ({
    slashTexture: { value: slashTextureJaune },
    baseNoise: { value: noiseTexture },
    time: { value: 0 },
    erosionAmount: { value: 0.2 },
    erosionColor: { value: new THREE.Color(1.0, 0.8, 1.0) }, // Violet très clair/blanc-violet
    color: { value: new THREE.Color(0.9, 0.7, 1.0) }, // Violet pastel
    textureOffset: { value: new THREE.Vector2(0.2, 0.0) },
    zoom: { value: 0.53 },
    rotateAll: { value: 0.0 },
    emissionStrength: { value: 0.8 },
    mixStrength: { value: 1.2 }
  }), [slashTextureJaune, noiseTexture])

  const uniforms_particule = useMemo(() => ({
    slashTexture: { value: slashTextureParticule },
    baseNoise: { value: noiseTexture },
    time: { value: 0 },
    erosionAmount: { value: 0.5 },
    erosionColor: { value: new THREE.Color(1.0, 0.9, 1.0) }, // Blanc-violet
    color: { value: new THREE.Color(0.8, 0.3, 1.0) }, // Violet vif
    textureOffset: { value: new THREE.Vector2(0.2, 0.0) },
    zoom: { value: 0.5 },
    rotateAll: { value: 0.0 },
    emissionStrength: { value: 2 },
    mixStrength: { value: 4 }
  }), [slashTextureParticule, noiseTexture])
  
  // Animation function avec mouvement de rotation
  const startAnimation = useCallback(() => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setAnimationProgress(0)
    
    const duration = 1000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      setAnimationProgress(progress)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        setAnimationProgress(0)
      }
    }
    
    animate()
  }, [isAnimating])
  
  // Animation de rotation de l'épée
  useFrame(() => {
    if (isAnimating) {
      // Animation des shaders
      if (materialRefBlanc.current && materialRefRouge.current && materialRefJaune.current && materialRefParticule.current) {
        const shaderProgress = animationProgress
        materialRefBlanc.current.uniforms.time.value = shaderProgress/3
        materialRefRouge.current.uniforms.time.value = shaderProgress/3
        materialRefJaune.current.uniforms.time.value = shaderProgress/3
        materialRefParticule.current.uniforms.time.value = shaderProgress/3
      }
      
      // Animation de rotation de l'épée (mouvement circulaire)
      if (swordRef.current) {
        const t = animationProgress
        
        const easeRotation = 1 - Math.pow(1 - t, 3)
        const rotationAngle = -easeRotation * Math.PI * 2
        
        const radius = 1
        const centerX = 0
        const centerY = 0
        
        const posX = centerX + Math.cos(rotationAngle - Math.PI / 2) * radius
        const posY = centerY + Math.sin(rotationAngle - Math.PI / 2) * radius
        const posZ = 0
        
        const rotX = 0
        const rotY = 0
        const rotZ = rotationAngle - Math.PI / 2
        
        swordRef.current.position.set(posX, posY, posZ)
        swordRef.current.rotation.set(rotX, rotY, rotZ)
      }
    } else {
      if (swordRef.current) {
        swordRef.current.position.set(0, 2, 0)
        swordRef.current.rotation.set(0, 0, -Math.PI / 2)
      }
    }
  })
  
  // Extract geometry from FBX
  const slashGeometry = useMemo(() => {
    if (fbxModel) {
      let foundGeometry = null
      fbxModel.traverse((child) => {
        if (child.isMesh && child.geometry) {
          foundGeometry = child.geometry
        }
      })
      return foundGeometry
    }
    return null
  }, [fbxModel])
  
  // Show loader if not ready
  if (!slashGeometry || !scene || !slashTextureBlanc || !slashTextureRouge || !slashTextureJaune || !slashTextureParticule || !noiseTexture) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="gray" wireframe />
      </mesh>
    )
  }
  
  // Composant des effets à attacher
  const SlashEffects = () => (
    <group position={[0, -4.2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[3.4, 3.4, 0]}>
      <mesh geometry={slashGeometry}>
        <shaderMaterial
          ref={materialRefBlanc}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms_blanc}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      
      <mesh geometry={slashGeometry} position={[0,0,0.01]}>
        <shaderMaterial
          ref={materialRefRouge}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms_rouge}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      <mesh geometry={slashGeometry} position={[0,0,0.02]}>
        <shaderMaterial
          ref={materialRefJaune}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms_jaune}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      <mesh geometry={slashGeometry} position={[0,-0.5,0]} scale={[1.2, 1.2, 1.2]}>
        <shaderMaterial
          ref={materialRefParticule}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms_particule}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      
      {/* Particles directement attachées aux effets de slash */}
      <SlashParticles 
        slashGeometry={slashGeometry}
        animationProgress={animationProgress}
      />
    </group>
  )
  
  return (
    <group>
      <EffectComposer>
        <Bloom color={new THREE.Color(0.8, 0.4, 1)} intensity={0.5} />
      </EffectComposer>
  
      {/* L'épée */}
      <group ref={swordRef} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[2, 2, 2]}>
        <primitive object={scene} scale={[0.3, 0.3, 0.3]} rotation={[0, -Math.PI / 2, 0]} />
        
        {/* Attacher les effets à blade_0 via createPortal */}
        {isAnimating && bladeNode && createPortal(
          <SlashEffects />,
          bladeNode
        )}
        
        {/* Fallback: si blade_0 n'est pas trouvé, attacher au centre de l'épée */}
        {isAnimating && !bladeNode && (
          <group position={[1, 0, 0]}>
            <SlashEffects />
          </group>
        )}
      </group>
      
      {/* Particles supprimées d'ici car intégrées dans SlashEffects */}
      
      {/* Bouton pour lancer l'animation */}
      <mesh 
        position={[0, 4, 0]} 
        onClick={startAnimation}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'default'}
      >
        <boxGeometry args={[2, 0.5, 0.2]} />
        <meshBasicMaterial 
          color={isAnimating ? "#ff6666" : "#66ff66"} 
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* Texte du bouton */}
      <mesh position={[0, 4, 0.11]}>
        <boxGeometry args={[1.8, 0.3, 0.01]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

export default SwordSlash