import  {  useState } from 'react'
import { Vector3 } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { Box } from '@react-three/drei'
import { Coin } from './Coin'

// Type for a spawned coin
type SpawnedCoin = {
    id: string
    position: Vector3
    spawnTime: number
}

export const InteractiveObjects = () => {
    const [spawnedCoins, setSpawnedCoins] = useState<SpawnedCoin[]>([])
    
    const handleInteract = () => {
        // Create a new coin at a random position around the object
        const randomOffset = new Vector3(
            (Math.random() - 0.5) * 4, // -2 to +2 on X
            Math.random() * 2 + 1,    // 1 to 3 on Y (above ground)
            (Math.random() - 0.5) * 4  // -2 to +2 on Z
        )
        
        const newCoin: SpawnedCoin = {
            id: `coin-${Date.now()}-${Math.random()}`, // Unique ID
            position: new Vector3(0, 0, 0).add(randomOffset), // Position relative to spawner object
            spawnTime: Date.now()
        }
        
        setSpawnedCoins(prev => [...prev, newCoin])
    }

    // Function to collect a coin
    const collectCoin = (coinId: string) => {
        setSpawnedCoins(prev => prev.filter(coin => coin.id !== coinId))
    }

    return (
        <>
            {/* Coin spawner object */}
            <InteractiveObjectComponent
                id="coin-spawner"
                type="spawner"
                position={new Vector3(30, 1, 1)}
                radius={2}
                onInteract={handleInteract}
                interactionText={`Spawn a coin (${spawnedCoins.length} coins)`}
                interactionKey="f"
                onEnter={() => {
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
                {/* Visual indicator of coin count */}
                <Box args={[0.2, 0.2, 0.2]} position={[0, 1.2, 0]}>
                    <meshBasicMaterial color="white" />
                </Box>
            </InteractiveObjectComponent>

            {/* Render all spawned coins */}
            {spawnedCoins.map((spawnedCoin) => (
                <InteractiveObjectComponent
                    key={spawnedCoin.id}
                    id={spawnedCoin.id}
                    type="collectible"
                    position={spawnedCoin.position}
                    radius={1}
                    onInteract={() => collectCoin(spawnedCoin.id)}
                    interactionText="Collect coin (E)"
                    interactionKey="e"
                    onEnter={() => {
                    }}
                >
                    <Coin position={new Vector3(0, 0, 0)} />
                </InteractiveObjectComponent>
            ))}
        </>
    )
}