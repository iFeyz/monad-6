import  { useState } from 'react'
import { Vector3, Euler } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { useShipSync } from '../Stores/shipStore'
import { useMyId } from 'react-together'
import { Box, Cylinder, Sphere, Text } from '@react-three/drei'

import { RigidBody } from '@react-three/rapier'

export const SpaceshipSpawner = () => {
    const [, setSpawnedShips] = useState<string[]>([])
    const { addShip, ships } = useShipSync()
    const myId = useMyId()

    // Main ship spawner
    const handleSpawnShip = () => {
        if (!myId) return

        // Random position around spawner
        const spawnPosition = new Vector3(
            Math.random() * 20 - 10,  // -10 to +10
            2,                        // At height
            Math.random() * 20 - 10   // -10 to +10
        )
        
        const spawnRotation = new Euler(0, Math.random() * Math.PI * 2, 0)
        const newShipId = `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        addShip(newShipId, spawnPosition, spawnRotation)
        setSpawnedShips(prev => [...prev, newShipId])
        
    }

    return (
        <>
            {/* Main spawner */}
            <InteractiveObjectComponent
                id="spaceship-spawner"
                type="ship-spawner"
                position={new Vector3(10, 0, 10)}
                radius={3}
                onInteract={handleSpawnShip}
                interactionText={`Spawn a ship (${ships.length} ships)`}
                interactionKey="v"
                onEnter={() => {
                }}
                showDebugRadius={true}
            >
                        <RigidBody type="fixed" colliders="trimesh" gravityScale={0} enabledRotations={[true, true, true]} enabledTranslations={[true, true, true]}> 

                <group>
                    {/* Spawner base */}
                    <Cylinder args={[2, 2, 0.5, 8]}>
                        <meshStandardMaterial color="silver" metalness={0.8} roughness={0.2} />
                    </Cylinder>
                    
                    {/* Ship hologram */}
                    <group position={[0, 2, 0]}>
                        <Box args={[1, 0.3, 2]} rotation={[0, Math.PI / 4, 0]}>
                            <meshStandardMaterial 
                                color="cyan" 
                                transparent 
                                opacity={0.6}
                                emissive="cyan"
                                emissiveIntensity={0.3}
                            />
                        </Box>
                    </group>
                    
                    {/* Indicative text */}
                    <Text
                        position={[0, 3.5, 0]}
                        fontSize={0.4}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        SPACESHIP SPAWNER
                    </Text>
                    
                    {/* Energy particles */}
                    <Sphere args={[0.1, 8, 8]} position={[1.5, 1, 0]}>
                        <meshBasicMaterial color="yellow" />
                    </Sphere>
                    <Sphere args={[0.1, 8, 8]} position={[-1.5, 1, 0]}>
                        <meshBasicMaterial color="yellow" />
                    </Sphere>
                    <Sphere args={[0.1, 8, 8]} position={[0, 1, 1.5]}>
                        <meshBasicMaterial color="yellow" />
                    </Sphere>
                    <Sphere args={[0.1, 8, 8]} position={[0, 1, -1.5]}>
                        <meshBasicMaterial color="yellow" />
                    </Sphere>
                </group>
                </RigidBody>
            </InteractiveObjectComponent>
      
        </>
    )
}
