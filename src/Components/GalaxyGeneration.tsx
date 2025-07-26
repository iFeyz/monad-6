import * as THREE from 'three';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DirectionalLight } from 'three';
import { RigidBody} from '@react-three/rapier'
import { useControls, folder } from "leva";
import { useGLTF } from '@react-three/drei';

// Noise functions shader code (same as original)
const noiseFunctions = `
const float PI = 3.14159265;

//  Simplex 3D Noise 
//  by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

// 
float simplex3(vec3 v) { 
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

  //  x0 = x0 - 0. + 0.0 * C 
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
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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

  //Normalise gradients
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

float fractal3(      
  vec3 v,
  float sharpness,
  float period,
  float persistence,
  float lacunarity,
  int octaves
) {
  float n = 0.0;
  float a = 1.0; // Amplitude for current octave
  float max_amp = 0.0; // Accumulate max amplitude so we can normalize after
  float P = period;  // Period for current octave

  for(int i = 0; i < octaves; i++) {
      n += a * simplex3(v / P);
      a *= persistence;
      max_amp += a;
      P /= lacunarity;
  }

  // Normalize noise between [0.0, amplitude]
  return n / max_amp;
}

float terrainHeight(
  int type,
  vec3 v,
  float amplitude,
  float sharpness,
  float offset,
  float period,
  float persistence,
  float lacunarity,
  int octaves
) {
  float h = 0.0;

  if (type == 1) {
    h = amplitude * simplex3(v / period);
  } else if (type == 2) {
    h = fractal3( // Removed amplitude multiplication here, it's applied later
      v,
      sharpness,
      period, 
      persistence, 
      lacunarity, 
      octaves);
    h = pow(max(0.0, (h + 1.0) / 2.0), sharpness); // h is now [0,1]
  } else if (type == 3) {
    h = fractal3(
      v,
      sharpness,
      period, 
      persistence, 
      lacunarity, 
      octaves);
    h = pow(max(0.0, 1.0 - abs(h)), sharpness); // h is now [0,1]
  }

  // Multiply by amplitude and adjust offset
  return max(0.0, h * amplitude + offset); // Apply amplitude here
}
`;

// Planet vertex shader
const planetVertexShader = `
attribute vec3 tangent;

// Terrain generation parameters
uniform int type;
uniform float radius;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;

// Bump mapping
uniform float bumpStrength;
uniform float bumpOffset;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

${noiseFunctions}

void main() {
  // Calculate terrain height
  float h = terrainHeight(
    type,
    position,
    amplitude, 
    sharpness,
    offset,
    period, 
    persistence, 
    lacunarity, 
    octaves);

  vec3 pos = position * (radius + h);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  fragPosition = position;
  fragNormal = normal;
  fragTangent = tangent;
  fragBitangent = cross(normal, tangent);
}
`;

// Planet fragment shader
const planetFragmentShader = `
// Terrain generation parameters
uniform int type;
uniform float radius;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;

// Layer colors
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;

// Transition points for each layer
uniform float transition2;
uniform float transition3;
uniform float transition4;
uniform float transition5;

// Amount of blending between each layer
uniform float blend12;
uniform float blend23;
uniform float blend34;
uniform float blend45;

// Bump mapping parameters
uniform float bumpStrength;
uniform float bumpOffset;

// Lighting parameters
uniform float ambientIntensity;
uniform float diffuseIntensity;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 lightDirection;
uniform vec3 lightColor;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

${noiseFunctions}

void main() {
  // Calculate terrain height
  float h = terrainHeight(
    type,
    fragPosition,
    amplitude, 
    sharpness,
    offset,
    period, 
    persistence, 
    lacunarity, 
    octaves);

  vec3 dx = bumpOffset * fragTangent;
  float h_dx = terrainHeight(
    type,
    fragPosition + dx,
    amplitude, 
    sharpness,
    offset,
    period, 
    persistence, 
    lacunarity, 
    octaves);

  vec3 dy = bumpOffset * fragBitangent;
  float h_dy = terrainHeight(
    type,
    fragPosition + dy,
    amplitude, 
    sharpness,
    offset,
    period, 
    persistence, 
    lacunarity, 
    octaves);

  vec3 pos = fragPosition * (radius + h);
  vec3 pos_dx = (fragPosition + dx) * (radius + h_dx);
  vec3 pos_dy = (fragPosition + dy) * (radius + h_dy);

  // Recalculate surface normal post-bump mapping
  vec3 bumpNormal = normalize(cross(pos_dx - pos, pos_dy - pos));
  // Mix original normal and bumped normal to control bump strength
  vec3 N = normalize(mix(fragNormal, bumpNormal, bumpStrength));

  // Normalized light direction (points in direction that light travels)
  vec3 L = normalize(-lightDirection);
  // View vector from camera to fragment
  vec3 V = normalize(cameraPosition - pos);
  // Reflected light vector
  vec3 R = normalize(reflect(L, N));

  float diffuse = 0.7;

  // https://ogldev.org/www/tutorial19/tutorial19.html
  float specularFalloff = clamp((transition3 - h) / transition3, 0.0, 1.0);
  float specular = max(0.0, specularFalloff * specularIntensity * pow(dot(V, R), shininess));

  float light = ambientIntensity + diffuse + specular;

  // Blender colors layer by layer
  vec3 color12 = mix(
    color1, 
    color2, 
    smoothstep(transition2 - blend12, transition2 + blend12, h));

  vec3 color123 = mix(
    color12, 
    color3, 
    smoothstep(transition3 - blend23, transition3 + blend23, h));

  vec3 color1234 = mix(
    color123, 
    color4, 
    smoothstep(transition4 - blend34, transition4 + blend34, h));

  vec3 finalColor = mix(
    color1234, 
    color5, 
    smoothstep(transition5 - blend45, transition5 + blend45, h));
  
  gl_FragColor = vec4(light * finalColor * lightColor, 1.0);
}
`;

// Shaders pour les cristaux
const CrystalVertexShader = `
    uniform float uTime;
    uniform float uScale;
    
    varying vec3 vView;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vLocalPosition;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vLocalPosition = position;
        
        // Légère oscillation pour donner vie aux cristaux
        vec3 scaledPosition = position * uScale;
        scaledPosition.y += sin(uTime * 2.0 + position.x * 10.0) * 0.02;
        
        vec4 mvPosition = modelViewMatrix * vec4(scaledPosition, 1.0);
        vView = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const CrystalFragmentShader = `
    uniform float uTime;
    uniform float uAlpha;
    uniform vec3 uColor;
    uniform vec3 uRimColor;
    uniform float uRimPower;
    uniform float uBloomIntensity;

    varying vec3 vView;
    varying vec3 vNormal;
    varying vec3 vLocalPosition;

    void main() {
        vec3 viewDir = normalize(vView);
        vec3 normal = normalize(vNormal);
        float rimDot = 1.0 - max(0.0, dot(viewDir, normal));
        float rim = pow(rimDot, uRimPower);
        
        vec3 baseColor = uColor;
        vec3 emissiveColor = rim * uRimColor * uBloomIntensity;
        
        // Ajout d'une variation de couleur basée sur le temps
        vec3 timeColor = mix(uColor, uRimColor, sin(uTime + vLocalPosition.y * 5.0) * 0.5 + 0.5);
        
        vec3 finalColor = mix(baseColor, timeColor, 0.3) + emissiveColor;
        float finalAlpha = mix(uAlpha, 1.0, rim * 0.5);
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

// Fonction utilitaire pour calculer la hauteur du terrain (version JavaScript)
const calculateTerrainHeight = (position: THREE.Vector3, planetParams: any) => {
  // Simplifié pour les performances - utilise juste du bruit sinusoïdal
  const x = position.x;
  const y = position.y;  
  const z = position.z;
  
  const noise = (Math.sin(x * planetParams.period * 10) + 
                Math.cos(y * planetParams.period * 10) + 
                Math.sin(z * planetParams.period * 10)) / 3;
  
  return Math.max(0, noise * planetParams.amplitude + planetParams.offset);
};

// Composant pour un cristal individuel
const Crystal = ({ position, normal, scale, planetRadius, color, rimColor, alpha }: {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: number;
  planetRadius: number;
  color: string;
  rimColor: string;
  alpha: number;
}) => {

  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Charger le modèle de cristal
  const { scene } = useGLTF('/crystal.glb');
  
  // Créer le matériau shader pour le cristal
  const crystalMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: CrystalVertexShader,
      fragmentShader: CrystalFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uAlpha: { value: alpha },
        uColor: { value: new THREE.Color(color) },
        uRimColor: { value: new THREE.Color(rimColor) },
        uRimPower: { value: 2.0 },
        uBloomIntensity: { value: 1.5 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }, [color, rimColor, alpha]);

  // Calculer la taille relative au rayon de la planète
  const finalScale = useMemo(() => {
    const baseScale = planetRadius * 0.001; // Ajusté pour le modèle 3D
    return baseScale * scale;
  }, [planetRadius, scale]);

  // Cloner et préparer la scène du cristal
  const crystalScene = useMemo(() => {
    if (!scene) return null;
    
    const clonedScene = scene.clone();
    
    // Appliquer le matériau à tous les meshes
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = crystalMaterial;
      }
    });
    
    return clonedScene;
  }, [scene, crystalMaterial]);

  // Positionner et orienter le cristal
  useEffect(() => {
    if (meshRef.current && crystalScene) {
      meshRef.current.position.copy(position);
      
      // Orienter selon la normale
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, normal);
      meshRef.current.setRotationFromQuaternion(quaternion);
      
      meshRef.current.scale.setScalar(finalScale);
    }
  }, [position, normal, finalScale, crystalScene]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = Date.now() * 0.001;
      }
    }, 100); // Mise à jour toutes les 100ms au lieu de chaque frame
  
    return () => clearInterval(interval);
  }, []); 


  if (!crystalScene) return null;
  
  return (
    <group ref={meshRef} >
      <primitive object={crystalScene} />
    </group>
  );
};

// Système de génération de cristaux
const CrystalSystem = ({ planetParams, crystalParams }: { planetParams: any; crystalParams: any }) => {
  
  const crystalData = useMemo(() => {
    const crystals = [];
    const numCrystals = Math.min(8, Math.floor(planetParams.params.radius * 0.3)); // Maximum 8 cristaux par planète
    
    for (let i = 0; i < numCrystals; i++) {
      // Générer une position aléatoire sur la sphère unitaire
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      
      // Position sur la sphère unitaire
      const spherePosition = new THREE.Vector3(x, y, z);
      
      // Calculer la hauteur du terrain à cette position (même logique que le vertex shader)
      const terrainHeight = calculateTerrainHeight(spherePosition, planetParams.params);
      
      // Rayon final APRÈS transformation du vertex shader : (radius + terrainHeight) * scale
      const finalRadius = (planetParams.params.radius + terrainHeight) * planetParams.scale * 0.9;
      
      // Position finale sur la surface transformée
      const surfacePosition = spherePosition.clone().multiplyScalar(finalRadius);
      
      // Ajouter la position de la planète
      surfacePosition.add(planetParams.position);
      
      // La normale est la direction depuis le centre vers le point de surface
      const normal = spherePosition.clone().normalize();
      
      // Taille aléatoire du cristal
      const scale = crystalParams.minSize + Math.random() * (crystalParams.maxSize - crystalParams.minSize);
      
      crystals.push({
        id: i,
        position: surfacePosition,
        normal: normal,
        scale: scale
      });
    }
    
    return crystals;
  }, [planetParams, crystalParams]);
  return (
    <group>
      {crystalData.map(crystal => (
      <Crystal 
        position={crystal.position}
        normal={crystal.normal}
        scale={crystal.scale}
        planetRadius={50} // Valeur fixe ou passer en prop
        color={crystalParams.color}
        rimColor={crystalParams.rimColor}
        alpha={crystalParams.alpha}
      />
      ))}
    </group>
  );
};

// Add Crystal data interface
interface CrystalData {
  id: string;
  chunkKey: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Vector3;
  scale: number;
  crystalParams: {
    color: string;
    baseColor: string;
    rimColor: string;
    rimColor2: string;
    alpha: number;
    bloomIntensity: number;
  };
}

interface PlanetData {
  id: string;
  chunkKey: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Vector3;
  movementSpeed: THREE.Vector3;
  scale: number;
  params: {
    type: number;
    radius: number;
    amplitude: number;
    sharpness: number;
    offset: number;
    period: number;
    persistence: number;
    lacunarity: number;
    octaves: number;
    rng: SeededRandom;
  };
  colors: {
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    color5: string;
  };
  material: {
    bumpStrength: number;
    bumpOffset: number;
  };
}

interface ChunkData {
  key: string;
  position: THREE.Vector3;
  planets: PlanetData[];
  crystals: CrystalData[]; // Add crystals array
}

// Seeded random number generator for consistent generation
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Individual Crystal Component wrapper for galaxy
const GalaxyCrystal = ({ crystalData }: { crystalData: CrystalData }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const time = state.clock.elapsedTime;

    // Update rotation
    group.rotation.x += crystalData.rotationSpeed.x;
    group.rotation.y += crystalData.rotationSpeed.y;
    group.rotation.z += crystalData.rotationSpeed.z;

    // Subtle floating animation
    group.position.y = crystalData.position.y + Math.sin(time * 0.5) * 2;
  });

  return (
    <RigidBody colliders={false}>
      <group 
        ref={groupRef}
        position={crystalData.position}
        rotation={crystalData.rotation}
        scale={crystalData.scale}
      >
        <Crystal 
          position={crystalData.position}
          normal={crystalData.normal}
          scale={crystalData.scale}
          planetRadius={planetParams.radius}
          color={crystalParams.color}
          rimColor={crystalParams.rimColor}
          alpha={crystalParams.alpha}
        />
      </group>
    </RigidBody>
  );
};

const GalaxyPlanet = ({ planetData, crystalParams }: { planetData: PlanetData, crystalParams: any }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 16, 12);    geo.computeTangents?.();
    return geo;
  }, []);

  const shaderUniforms = useMemo(() => ({
    type: { value: planetData.params.type },
    radius: { value: planetData.params.radius },
    amplitude: { value: planetData.params.amplitude },
    sharpness: { value: planetData.params.sharpness },
    offset: { value: planetData.params.offset },
    period: { value: planetData.params.period },
    persistence: { value: planetData.params.persistence },
    lacunarity: { value: planetData.params.lacunarity },
    octaves: { value: planetData.params.octaves },
    bumpStrength: { value: planetData.material.bumpStrength },
    bumpOffset: { value: planetData.material.bumpOffset },
    ambientIntensity: { value: 0.2 },
    diffuseIntensity: { value: 1 },
    specularIntensity: { value: 2 },
    shininess: { value: 10 },
    lightDirection: { value: new THREE.Vector3(1, 1, 1) },
    lightColor: { value: new THREE.Color(0xffffff) },
    color1: { value: new THREE.Color(planetData.colors.color1) },
    color2: { value: new THREE.Color(planetData.colors.color2) },
    color3: { value: new THREE.Color(planetData.colors.color3) },
    color4: { value: new THREE.Color(planetData.colors.color4) },
    color5: { value: new THREE.Color(planetData.colors.color5) },
    transition2: { value: 0.071 },
    transition3: { value: 0.215 },
    transition4: { value: 0.372 },
    transition5: { value: 1.2 },
    blend12: { value: 0.152 },
    blend23: { value: 0.152 },
    blend34: { value: 0.104 },
    blend45: { value: 0.168 },
  }), [planetData]);


  useFrame((state) => {
    if (!meshRef.current) return;
  
    const mesh = meshRef.current;
  
    // Update rotation
    mesh.rotation.x += planetData.rotationSpeed.x;
    mesh.rotation.y += planetData.rotationSpeed.y;
    mesh.rotation.z += planetData.rotationSpeed.z;
  
    // Update position with subtle movement
    const time = state.clock.elapsedTime;
    mesh.position.x = planetData.position.x + Math.sin(time * planetData.movementSpeed.x) * 2;
    mesh.position.y = planetData.position.y + Math.cos(time * planetData.movementSpeed.y) * 1;
    mesh.position.z = planetData.position.z + Math.sin(time * planetData.movementSpeed.z) * 2;
  });

  return (
   // <RigidBody type="fixed" colliders="hull">
   <group>
           <RigidBody colliders={false}>
                <mesh position={[planetData.position.x, planetData.position.y, planetData.position.z]}>
                    <sphereGeometry args={[planetData.params.rng.random() * 30 * planetData.scale + 50]} />
                    
                    <meshPhongMaterial color="#ff0000" opacity={0.1} transparent />

                </mesh>
        </RigidBody> 
    <mesh 
      ref={meshRef} 
      geometry={geometry}
      position={planetData.position}
      rotation={planetData.rotation}
      scale={planetData.scale}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={planetVertexShader}
        fragmentShader={planetFragmentShader}
        uniforms={shaderUniforms}
      />
    </mesh>
    <CrystalSystem 
    planetParams={planetData}
    crystalParams={crystalParams}
  />

    </group>
 
  );
};
// Chunk-based Galaxy System
export const ProceduralGalaxy = () => {
  const { camera } = useThree();
  const [chunks, setChunks] = useState<Map<string, ChunkData>>(new Map());
  const lastCameraPosition = useRef(new THREE.Vector3());
  const updateInterval = useRef(0);

  // Galaxy settings
  const CHUNK_SIZE = 3000;
  const RENDER_DISTANCE = 2;
  const PLANETS_PER_CHUNK = 0;
  const MAX_PLANETS_PER_CHUNK = 3;
  const CRYSTALS_PER_CHUNK = 0;
  const MAX_CRYSTALS_PER_CHUNK = 5; // More crystals than planets for magical feel
  const UPDATE_FREQUENCY = 120; // Mise à jour 4 fois moins fréquente

  const crystalParams = useControls('Crystals', {
    enabled: { value: true },
    density: { value: 1.0, min: 0.1, max: 3.0, step: 0.1 },
    minSize: { value: 1.0, min: 0.5, max: 3.0, step: 0.1 },
    maxSize: { value: 3.0, min: 1.0, max: 8.0, step: 0.1 },
    color: { value: '#b842e5' },
    rimColor: { value: '#ffff00' },
    alpha: { value: 0.8, min: 0.1, max: 1.0, step: 0.1 },
  });


  const colorSchemes = [
    {
      color1: '#2e0854',
      color2: '#5f1b79',
      color3: '#9163c0',
      color4: '#b49de8',
      color5: '#dcd3ff'
    },
  ];

  const crystalColorSchemes = [
    {
      color: '#b842e5',
      baseColor: '#ffffff',
      rimColor: '#ffff00',
      rimColor2: '#ff00ff',
      alpha: 0.3,
      bloomIntensity: 1.5
    },
    {
      color: '#42e5f5',
      baseColor: '#ffffff',
      rimColor: '#00ffff',
      rimColor2: '#0080ff',
      alpha: 0.4,
      bloomIntensity: 2.0
    },
    {
      color: '#e542b8',
      baseColor: '#ffccff',
      rimColor: '#ff4080',
      rimColor2: '#ff0040',
      alpha: 0.2,
      bloomIntensity: 1.8
    },
  ];

  // Generate chunk key from position
  const getChunkKey = (x: number, y: number, z: number): string => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    return `${chunkX},${chunkY},${chunkZ}`;
  };

  // Generate crystals for a chunk
  const generateChunkCrystals = (chunkKey: string, rng: SeededRandom): CrystalData[] => {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
    
    // 60% chance of having crystals in a chunk
    if (rng.random() < 0.4) {
      return [];
    }

    const crystalCount = Math.floor(rng.random() * (MAX_CRYSTALS_PER_CHUNK - CRYSTALS_PER_CHUNK + 1)) + CRYSTALS_PER_CHUNK;
    const crystals: CrystalData[] = [];

    for (let i = 0; i < crystalCount; i++) {
      // Random position within chunk
      const position = new THREE.Vector3(
        chunkX * CHUNK_SIZE + rng.random() * CHUNK_SIZE,
        chunkY * CHUNK_SIZE + (rng.random() - 0.5) * CHUNK_SIZE * 0.2, // Keep crystals in a flatter distribution
        chunkZ * CHUNK_SIZE + rng.random() * CHUNK_SIZE
      );

      // Random rotation
      const rotation = new THREE.Euler(
        rng.random() * Math.PI * 2,
        rng.random() * Math.PI * 2,
        rng.random() * Math.PI * 2
      );

      // Random rotation speeds (very slow for mystical effect)
      const rotationSpeed = new THREE.Vector3(
        (rng.random() - 0.5) * 0.002,
        (rng.random() - 0.5) * 0.002,
        (rng.random() - 0.5) * 0.002
      );

      // Random scale (various sizes)
      const scale = rng.random() * 15 + 5; // 5 to 20

      // Random crystal color scheme
      const colorScheme = crystalColorSchemes[Math.floor(rng.random() * crystalColorSchemes.length)];

      crystals.push({
        id: `crystal-${chunkKey}-${i}`,
        chunkKey,
        position,
        rotation,
        rotationSpeed,
        scale,
        crystalParams: colorScheme
      });
    }

    return crystals;
  };

  // Generate planets for a chunk using seeded randomization
  const generateChunkPlanets = (chunkKey: string): PlanetData[] => {
    const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);

    const seed = chunkX * 73856093 ^ chunkY * 19349663 ^ chunkZ * 83492791;
    const rng = new SeededRandom(Math.abs(seed));
    
    if (rng.random() < 0.4) {
      return []; 
    }
    
    const planetCount = Math.floor(rng.random() * (MAX_PLANETS_PER_CHUNK - PLANETS_PER_CHUNK + 1)) + PLANETS_PER_CHUNK;
    const planets: PlanetData[] = [];

    for (let i = 0; i < planetCount; i++) {
      const position = new THREE.Vector3(
        chunkX * CHUNK_SIZE + rng.random() * CHUNK_SIZE,
        chunkY * CHUNK_SIZE + (rng.random() - 0.5) * CHUNK_SIZE * 0.3,
        chunkZ * CHUNK_SIZE + rng.random() * CHUNK_SIZE
      );

      const rotation = new THREE.Euler(
        rng.random() * Math.PI * 2,
        rng.random() * Math.PI * 2,
        rng.random() * Math.PI * 2
      );

      const rotationSpeed = new THREE.Vector3(
        (rng.random() - 0.5) * 0.001,
        (rng.random() - 0.5) * 0.001,
        (rng.random() - 0.5) * 0.001
      );

      const movementSpeed = new THREE.Vector3(
        (rng.random() - 0.5) * 0.05,
        (rng.random() - 0.5) * 0.05,
        (rng.random() - 0.5) * 0.05
      );

      const scale = rng.random() * 2.5 + 1.0;

      const params = {
        type: Math.floor(rng.random() * 3) + 1,
        radius: rng.random() * 30,
        amplitude: rng.random() * 6 + 2,
        sharpness: rng.random() * 5 + 1,
        offset: (rng.random() - 0.5) * 0.5,
        period: rng.random() * 1.5 + 0.3,
        persistence: rng.random() * 0.8 + 0.2,
        lacunarity: rng.random() * 2 + 1.5,
        octaves: Math.floor(rng.random() * 8) + 3,
        rng: rng
      };

      const colorScheme = colorSchemes[Math.floor(rng.random() * colorSchemes.length)];

      const material = {
        bumpStrength: rng.random() * 1.5 + 0.5,
        bumpOffset: rng.random() * 0.005 + 0.001
      };

      planets.push({
        id: `planet-${chunkKey}-${i}`,
        chunkKey,
        position,
        rotation,
        rotationSpeed,
        movementSpeed,
        scale,
        params,
        colors: colorScheme,
        material
      });
    }

    return planets;
  };

  // Update chunks based on camera position
  const updateChunks = () => {
    const cameraPos = camera.position;
    const currentChunkKey = getChunkKey(cameraPos.x, cameraPos.y, cameraPos.z);
    
    const newChunks = new Map<string, ChunkData>();
    
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
      for (let y = -RENDER_DISTANCE; y <= RENDER_DISTANCE; y++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
          const [baseX, baseY, baseZ] = currentChunkKey.split(',').map(Number);
          const chunkKey = `${baseX + x},${baseY + y},${baseZ + z}`;
          
          if (chunks.has(chunkKey)) {
            newChunks.set(chunkKey, chunks.get(chunkKey)!);
          } else {
            const planets = generateChunkPlanets(chunkKey);
            
            // Generate crystals with separate RNG to avoid affecting planet generation
            const crystalSeed = chunkKey.split(',').map(Number).reduce((a, b) => a + b, 0) * 31337;
            const crystalRng = new SeededRandom(Math.abs(crystalSeed));
            const crystals = generateChunkCrystals(chunkKey, crystalRng);
            
            const [chunkX, chunkY, chunkZ] = chunkKey.split(',').map(Number);
            
            newChunks.set(chunkKey, {
              key: chunkKey,
              position: new THREE.Vector3(
                chunkX * CHUNK_SIZE + CHUNK_SIZE / 2,
                chunkY * CHUNK_SIZE + CHUNK_SIZE / 2,
                chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2
              ),
              planets,
              crystals
            });
          }
        }
      }
    }
    
    setChunks(newChunks);
  };

  // Update chunks when camera moves significantly or on interval
  useFrame(() => {
    updateInterval.current++;
    
    if (updateInterval.current >= UPDATE_FREQUENCY) {
      updateInterval.current = 0;
      
      const cameraPos = camera.position;
      const distance = lastCameraPosition.current.distanceTo(cameraPos);
      
      if (distance > CHUNK_SIZE * 0.1) { 
        lastCameraPosition.current.copy(cameraPos);
        updateChunks();
      }
    }
  });

  // Initial chunk generation
  useEffect(() => {
    updateChunks();
  }, []);

  // Render all planets and crystals from active chunks
  const allObjects = useMemo(() => {
    const planets: PlanetData[] = [];
    const crystals: CrystalData[] = [];
    
    chunks.forEach(chunk => {
      planets.push(...chunk.planets);
      crystals.push(...chunk.crystals);
    });
    
    return { planets, crystals };
  }, [chunks]);

  return (
    <group>
      {/* Render Planets */}
      {allObjects.planets.map((planetData) => (
        <GalaxyPlanet key={planetData.id} planetData={planetData} crystalParams={crystalParams} />
      ))}
      

    </group>
  );
};