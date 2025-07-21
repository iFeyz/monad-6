import React, { useRef, useState } from 'react'
import { Vector3 } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { usePlayerStore } from '../Stores/playersStore'
import { Box, Cylinder, Sphere } from '@react-three/drei'
import type { ActiveInteract } from '../Stores/interactStore'
import { Coin } from './Coin'

// Type pour une pièce spawnée
type SpawnedCoin = {
    id: string
    position: Vector3
    spawnTime: number
}

export const InteractiveObjects = () => {
    const [spawnedCoins, setSpawnedCoins] = useState<SpawnedCoin[]>([])
    const coinRef = useRef<any>(null)
    
    const handleInteract = (interaction: ActiveInteract) => {
        // Créer une nouvelle pièce à une position aléatoire autour de l'objet
        const randomOffset = new Vector3(
            (Math.random() - 0.5) * 4, // -2 à +2 sur X
            Math.random() * 2 + 1,    // 1 à 3 sur Y (au-dessus du sol)
            (Math.random() - 0.5) * 4  // -2 à +2 sur Z
        )
        
        const newCoin: SpawnedCoin = {
            id: `coin-${Date.now()}-${Math.random()}`, // ID unique
            position: new Vector3(0, 0, 0).add(randomOffset), // Position relative à l'objet spawner
            spawnTime: Date.now()
        }
        
        setSpawnedCoins(prev => [...prev, newCoin])
        console.log(`Pièce spawnée par ${interaction.playerId}!`, newCoin)
    }

    // Fonction pour collecter une pièce
    const collectCoin = (coinId: string, interaction: ActiveInteract) => {
        setSpawnedCoins(prev => prev.filter(coin => coin.id !== coinId))
        console.log(`Pièce ${coinId} collectée par ${interaction.playerId}!`)
    }

    return (
        <>
            {/* Objet spawner de pièces */}
            <InteractiveObjectComponent
                id="coin-spawner"
                type="spawner"
                position={new Vector3(0, 1, 0)}
                radius={2}
                onInteract={handleInteract}
                interactionText={`Spawner une pièce (${spawnedCoins.length} pièces)`}
                interactionKey="f"
                onEnter={(interaction) => {
                    console.log(`${interaction.playerId} s'approche du spawner`)
                }}
                showDebugRadius={true}
            >
                <Box args={[1, 1, 1]}>
                    <meshStandardMaterial 
                        color="gold" 
                        emissive="gold" 
                        emissiveIntensity={0.2}
                    />
                </Box>
                {/* Indicateur visuel du nombre de pièces */}
                <Box args={[0.2, 0.2, 0.2]} position={[0, 1.2, 0]}>
                    <meshBasicMaterial color="white" />
                </Box>
            </InteractiveObjectComponent>

            {/* Rendu de toutes les pièces spawnées */}
            {spawnedCoins.map((spawnedCoin) => (
                <InteractiveObjectComponent
                    key={spawnedCoin.id}
                    id={spawnedCoin.id}
                    type="collectible"
                    position={spawnedCoin.position}
                    radius={1}
                    onInteract={(interaction) => collectCoin(spawnedCoin.id, interaction)}
                    interactionText="Collecter la pièce (E)"
                    interactionKey="e"
                    onEnter={(interaction) => {
                        console.log(`${interaction.playerId} près d'une pièce`)
                    }}
                >
                    <Coin position={new Vector3(0, 0, 0)} />
                </InteractiveObjectComponent>
            ))}
        </>
    )
}