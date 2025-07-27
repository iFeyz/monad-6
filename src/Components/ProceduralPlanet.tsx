import * as THREE from 'three';
import { useControls } from 'leva';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame  } from '@react-three/fiber';
import { useGLTF } from "@react-three/drei";

// Noise functions shader code
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

  float diffuse = 1.0;

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


// Atmosphere fragment shader

// Crystal shaders
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
        
        // Subtle oscillation to give life to crystals
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
        
        // Add time-based color variation
        vec3 timeColor = mix(uColor, uRimColor, sin(uTime + vLocalPosition.y * 5.0) * 0.5 + 0.5);
        
        vec3 finalColor = mix(baseColor, timeColor, 0.3) + emissiveColor;
        float finalAlpha = mix(uAlpha, 1.0, rim * 0.5);
        
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;



// Individual crystal component
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
  
  // Load crystal model
  const { scene } = useGLTF('/crystal.glb');
  
  // Create shader material for crystal
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

  // Calculate size relative to planet radius
  const finalScale = useMemo(() => {
    const baseScale = planetRadius * 0.001; // Adjusted for 3D model
    return baseScale * scale;
  }, [planetRadius, scale]);

  // Clone and prepare crystal scene
  const crystalScene = useMemo(() => {
    if (!scene) return null;
    
    const clonedScene = scene.clone();
    
    // Apply material to all meshes
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = crystalMaterial as THREE.Material;
      }
    });
    
    return clonedScene;
  }, [scene, crystalMaterial]);

  // Position and orient crystal
  useEffect(() => {
    if (meshRef.current && crystalScene) {
      meshRef.current.position.copy(position);
      
      // Orient according to normal
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, normal);
      meshRef.current.setRotationFromQuaternion(quaternion);
      
      meshRef.current.scale.setScalar(finalScale);
    }
  }, [position, normal, finalScale, crystalScene]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!crystalScene) return null;

  return (
    <group ref={meshRef} >
      <primitive object={crystalScene} />
    </group>
  );
};

// Crystal generation system
const CrystalSystem = ({ planetParams, crystalParams }: { planetParams: any; crystalParams: any }) => {
  const crystalData = useMemo(() => {
    if (!crystalParams.enabled) return [];
    
    const crystals = [];
    const numCrystals = Math.floor(planetParams.radius * crystalParams.density);
    
    for (let i = 0; i < numCrystals; i++) {
      // Generate random position on unit sphere
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      
      const basePosition = new THREE.Vector3(x, y, z);
      
      // Calculate terrain height at this position
      
      // Final position on planet surface
      const surfaceRadius = planetParams.radius - 1;
      const surfacePosition = basePosition.clone().multiplyScalar(surfaceRadius);
      
      // Normal is direction from center to surface point
      const normal = basePosition.clone().normalize();
      
      // Random crystal size
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
          key={crystal.id}
          position={crystal.position}
          normal={crystal.normal}
          scale={crystal.scale}
          planetRadius={planetParams.radius}
          color={crystalParams.color}
          rimColor={crystalParams.rimColor}
          alpha={crystalParams.alpha}
        />
      ))}
    </group>
  );
};



export const ProceduralPlanet = () => {
    const planetMeshRef = useRef<THREE.Mesh>(null);

    const planetParams = useControls('Planet', {
      type: { value: 2, min: 1, max: 3, step: 1 },
      radius: { value: 20.0, min: 20, max: 50,  },
      amplitude: { value: 1.4, min: 0, max: 5 },
      sharpness: { value: 3.6, min: 0.1, max: 10 },
      offset: { value: -0.016, min: -1, max: 1 },
      period: { value: 0.6, min: 0.1, max: 2 },
      persistence: { value: 0.484, min: 0, max: 1 },
      lacunarity: { value: 1.8, min: 1, max: 4 },
      octaves: { value: 5, min: 1, max: 15, step: 1 },
      undulation: { value: 0.0, min: 0, max: 1 },
    });

    // Crystal controls
    const crystalParams = useControls('Crystals', {
      enabled: { value: true },
      density: { value: 1.0, min: 0.1, max: 3.0, step: 0.1 },
      minSize: { value: 1.0, min: 0.5, max: 3.0, step: 0.1 },
      maxSize: { value: 3.0, min: 1.0, max: 8.0, step: 0.1 },
      color: { value: '#b842e5' },
      rimColor: { value: '#ffff00' },
      alpha: { value: 0.8, min: 0.1, max: 1.0, step: 0.1 },
    });
  
    const lightingParams = useControls('Lighting', {
      ambientIntensity: { value: 0.2, min: 0, max: 1 },
      diffuseIntensity: { value: 1, min: 0, max: 2 },
      specularIntensity: { value: 4, min: 0, max: 5 },
      shininess: { value: 10, min: 1, max: 100 },
      lightDirection: { value: [10, 10, 10] },
    });
  
    const materialParams = useControls('Material', {
      bumpStrength: { value: 1.0, min: 0, max: 2 },
      bumpOffset: { value: 0.001, min: 0.0001, max: 0.01 },
    });
  
    const colorParams = useControls('Colors', {
      color1: { value: '#2e0854' },
      color2: { value: '#5f1b79' },
      color3: { value: '#9163c0' },
      color4: { value: '#b49de8' },
      color5: { value: '#dcd3ff' },
      transition2: { value: 0.071, min: 0, max: 1 },
      transition3: { value: 0.215, min: 0, max: 1 },
      transition4: { value: 0.372, min: 0, max: 1 },
      transition5: { value: 1.2, min: 0, max: 2 },
      blend12: { value: 0.152, min: 0, max: 0.5 },
      blend23: { value: 0.152, min: 0, max: 0.5 },
      blend34: { value: 0.104, min: 0, max: 0.5 },
      blend45: { value: 0.168, min: 0, max: 0.5 },
    });
  
    const geometry = useMemo(() => {
      const geo = new THREE.SphereGeometry(1, 64, 64); // Higher resolution for better details
      geo.computeTangents?.();
      return geo;
    }, []);
  
    const materialRef = useRef<THREE.ShaderMaterial>(null);
  
    useFrame(() => {
      const mat = materialRef.current;
      const mesh = planetMeshRef.current;
   
      if (!mat || !mesh) return;

      // Update shader uniforms
      const u = mat.uniforms;
  
      u.type.value = planetParams.type;
      u.radius.value = planetParams.radius;
      u.amplitude.value = planetParams.amplitude;
      u.sharpness.value = planetParams.sharpness;
      u.offset.value = planetParams.offset;
      u.period.value = planetParams.period;
      u.persistence.value = planetParams.persistence;
      u.lacunarity.value = planetParams.lacunarity;
      u.octaves.value = planetParams.octaves;
  
      u.bumpStrength.value = materialParams.bumpStrength;
      u.bumpOffset.value = materialParams.bumpOffset;
  
      u.ambientIntensity.value = lightingParams.ambientIntensity;
      u.diffuseIntensity.value = lightingParams.diffuseIntensity;
      u.specularIntensity.value = lightingParams.specularIntensity;
      u.shininess.value = lightingParams.shininess;
      u.lightDirection.value.set(...lightingParams.lightDirection);
  
      u.color1.value.set(colorParams.color1);
      u.color2.value.set(colorParams.color2);
      u.color3.value.set(colorParams.color3);
      u.color4.value.set(colorParams.color4);
      u.color5.value.set(colorParams.color5);
      u.transition2.value = colorParams.transition2;
      u.transition3.value = colorParams.transition3;
      u.transition4.value = colorParams.transition4;
      u.transition5.value = colorParams.transition5;
      u.blend12.value = colorParams.blend12;
      u.blend23.value = colorParams.blend23;
      u.blend34.value = colorParams.blend34;
      u.blend45.value = colorParams.blend45;

      const maxEffectiveRadius = planetParams.radius + planetParams.amplitude + Math.max(0, planetParams.offset);

      if (!mesh.geometry.boundingSphere) {
          mesh.geometry.boundingSphere = new THREE.Sphere();
      }

      mesh.geometry.boundingSphere.set(new THREE.Vector3(0, 0, 0), maxEffectiveRadius);
    });
  
    return (
      <group position={[0, -10, -80]}>
        {/* Main planet */}
        <mesh ref={planetMeshRef} geometry={geometry}> 
          <shaderMaterial
            ref={materialRef}
            vertexShader={planetVertexShader}
            fragmentShader={planetFragmentShader}
            uniforms={{
              type: { value: 2 },
              radius: { value: 20 },
              amplitude: { value: 1 },
              sharpness: { value: 2 },
              offset: { value: 0 },
              period: { value: 1 },
              persistence: { value: 0.5 },
              lacunarity: { value: 2 },
              octaves: { value: 8 },
  
              bumpStrength: { value: 1 },
              bumpOffset: { value: 0.001 },
  
              ambientIntensity: { value: 0.2 },
              diffuseIntensity: { value: 1 },
              specularIntensity: { value: 1 },
              shininess: { value: 10 },
              lightDirection: { value: new THREE.Vector3(1, 1, 1) },
              lightColor: { value: new THREE.Color(0xffffff) },
  
              color1: { value: new THREE.Color('#ffffff') },
              color2: { value: new THREE.Color('#ffffff') },
              color3: { value: new THREE.Color('#ffffff') },
              color4: { value: new THREE.Color('#ffffff') },
              color5: { value: new THREE.Color('#ffffff') },
              transition2: { value: 0.1 },
              transition3: { value: 0.2 },
              transition4: { value: 0.3 },
              transition5: { value: 0.4 },
              blend12: { value: 0.1 },
              blend23: { value: 0.1 },
              blend34: { value: 0.1 },
              blend45: { value: 0.1 },
            }}
          />
        </mesh>

        {/* Crystal system */}
        <CrystalSystem 
          planetParams={planetParams}
          crystalParams={crystalParams}
        />

        {/* Atmosphere disabled for now */}
      </group>
    );
  };