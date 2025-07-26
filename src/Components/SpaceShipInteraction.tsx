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

    // Fonction pour entrer dans un vaisseau
    const handleEnterShip = (shipId: string) => (interaction: ActiveInteract) => {
        if (!myId || interaction.playerId !== myId) return

        const controlledShip = getControlledShip(myId)
        
        if (controlledShip) {
            console.log(`${myId} contrôle déjà le vaisseau ${controlledShip.id}`)
            return
        }

        const targetShip = ships.find(ship => ship.id === shipId)
        
        if (!targetShip) {
            console.log(`Vaisseau ${shipId} introuvable`)
            return
        }

        if (targetShip.isControlled) {
            console.log(`Vaisseau ${shipId} déjà contrôlé par ${targetShip.isControlled}`)
            return
        }

        // Prendre le contrôle du vaisseau
        controlShip(shipId, myId)
        updateSpawned(false) // Despawn le joueur
        
        console.log(`${myId} entre dans le vaisseau ${shipId}`)
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
                        radius={6} // Zone d'interaction autour du vaisseau
                        onInteract={handleEnterShip(ship.id)}
                        interactionText={
                            isControlledByMe 
                                ? "Vous contrôlez ce vaisseau" 
                                : isAvailable 
                                    ? "Entrer dans le vaisseau (E)"
                                    : `Contrôlé par ${ship.isControlled}`
                        }
                        interactionKey="e"
                        enabled={isAvailable && !isControlledByMe}
                        onEnter={(interaction) => {
                            if (isAvailable) {
                                console.log(`${interaction.playerId} peut entrer dans le vaisseau ${ship.id}`)
                            }
                        }}
                        showDebugRadius={isAvailable}
                    >
                        {/* Indicateur visuel pour les vaisseaux disponibles */}
                        {isAvailable && (
                            <group position={[0, 0, 0]}>
                                <Sphere args={[0.1, 0.1, 0.1]}>
                                    <meshBasicMaterial color="green" />
                                </Sphere>
                            </group>
                        )}
                        
                        {/* Indicateur pour le vaisseau contrôlé par le joueur */}
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
