import * as THREE from 'three';
import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';



// Noise functions shader code (same as original)


// Shaders pour les cristaux





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
  const UPDATE_FREQUENCY = 30;

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
      
      if (distance > CHUNK_SIZE * 0.01) { 
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
 

  return (
    <group>


    </group>
  );
};