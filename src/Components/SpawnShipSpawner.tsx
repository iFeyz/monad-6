import React, { useState } from 'react'
import { Vector3, Euler } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { useShipSync } from '../Stores/shipStore'
import { useMyId } from 'react-together'
import { Box, Cylinder, Sphere, Text } from '@react-three/drei'
import type { ActiveInteract } from '../Stores/interactStore'
import { useGLTF } from '@react-three/drei'

export const SpaceshipSpawner = () => {
    const [spawnedShips, setSpawnedShips] = useState<string[]>([])
    const { addShip, ships } = useShipSync()
    const myId = useMyId()

    // Spawner principal de vaisseaux
    const handleSpawnShip = (interaction: ActiveInteract) => {
        if (!myId) return

        // Position aléatoire autour du spawner
        const spawnPosition = new Vector3(
            Math.random() * 20 - 10,  // -10 à +10
            5,                        // En hauteur
            Math.random() * 20 - 10   // -10 à +10
        )
        
        const spawnRotation = new Euler(0, Math.random() * Math.PI * 2, 0)
        const newShipId = `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        addShip(newShipId, spawnPosition, spawnRotation)
        setSpawnedShips(prev => [...prev, newShipId])
        
        console.log(`Vaisseau ${newShipId} spawné par ${interaction.playerId} à la position:`, spawnPosition)
    }

    return (
        <>
            {/* Spawner principal */}
            <InteractiveObjectComponent
                id="spaceship-spawner"
                type="ship-spawner"
                position={new Vector3(10, 2, 10)}
                radius={3}
                onInteract={handleSpawnShip}
                interactionText={`Spawner un vaisseau (${ships.length} vaisseaux)`}
                interactionKey="v"
                onEnter={(interaction) => {
                    console.log(`${interaction.playerId} s'approche du spawner de vaisseaux`)
                }}
                showDebugRadius={true}
            >
                <group>
                    {/* Base du spawner */}
                    <Cylinder args={[2, 2, 0.5, 8]}>
                        <meshStandardMaterial color="silver" metalness={0.8} roughness={0.2} />
                    </Cylinder>
                    
                    {/* Hologramme de vaisseau */}
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
                    
                    {/* Texte indicatif */}
                    <Text
                        position={[0, 3.5, 0]}
                        fontSize={0.4}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        SPACESHIP SPAWNER
                    </Text>
                    
                    {/* Particules d'énergie */}
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
            </InteractiveObjectComponent>
        </>
    )
}
