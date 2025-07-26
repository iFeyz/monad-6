import React from 'react'
import { Vector3 } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { useShipStore, useShipSync } from '../Stores/shipStore'
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore'
import { useMyId } from 'react-together'
import type { ActiveInteract } from '../Stores/interactStore'
import { Sphere } from '@react-three/drei'

export const SpaceshipInteractions = () => {
    const { ships, controlShip } = useShipSync()
    const myId = useMyId()
    const { updateSpawned } = usePlayerStateSyncManager(myId || '')
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const getControlledShip = useShipStore(state => state.getControlledShip)

    // Function to enter a ship
    const handleEnterShip = (shipId: string) => (interaction: ActiveInteract) => {
        if (!myId || interaction.playerId !== myId) return

        const controlledShip = getControlledShip(myId)
        
        if (controlledShip) {
            console.log(`${myId} already controls ship ${controlledShip.id}`)
            return
        }

        const targetShip = ships.find(ship => ship.id === shipId)
        
        if (!targetShip) {
            console.log(`Ship ${shipId} not found`)
            return
        }

        if (targetShip.isControlled) {
            console.log(`Ship ${shipId} already controlled by ${targetShip.isControlled}`)
            return
        }

        // Take control of the ship
        controlShip(shipId, myId)
        updateSpawned(false) // Despawn player
        
        console.log(`${myId} enters ship ${shipId}`)
    }

    return (
        <>
            {ships.map((ship) => {
                const isAvailable = !ship.isControlled
                const isControlledByMe = ship.isControlled === myId
                
                return (
                    <InteractiveObjectComponent
                        key={`interaction-${ship.id}`}
                        id={`ship-enter-${ship.id}`}
                        type="ship-entrance"
                        position={new Vector3(ship.position.x, ship.position.y , ship.position.z)}
                        radius={6} // Interaction zone around ship
                        onInteract={handleEnterShip(ship.id)}
                        interactionText={
                            isControlledByMe 
                                ? "You control this ship" 
                                : isAvailable 
                                    ? "Enter ship (E)"
                                    : `Controlled by ${ship.isControlled}`
                        }
                        interactionKey="e"
                        enabled={isAvailable && !isControlledByMe}
                        onEnter={(interaction) => {
                            if (isAvailable) {
                                console.log(`${interaction.playerId} can enter ship ${ship.id}`)
                            }
                        }}
                        showDebugRadius={isAvailable}
                    >
                        {/* Visual indicator for available ships */}
                        {isAvailable && (
                            <group position={[0, 0, 0]}>
                                <Sphere args={[0.1, 0.1, 0.1]}>
                                    <meshBasicMaterial color="green" />
                                </Sphere>
                            </group>
                        )}
                        
                        {/* Indicator for ship controlled by player */}
                        {isControlledByMe && (
                            <group position={[0, 0, 0]}>
                                <Sphere args={[0.1, 0.1, 0.1]}>
                                    <meshBasicMaterial color="blue" />
                                </Sphere>
                            </group>
                        )}
                    </InteractiveObjectComponent>
                )
            })}
        </>
    )
}
