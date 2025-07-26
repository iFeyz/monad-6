import React from 'react'
import { Vector3 } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { useShipStore, useShipSync } from '../Stores/shipStore'
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore'
import { useMyId } from 'react-together'
import type { ActiveInteract } from '../Stores/interactStore'
import { Box } from '@react-three/drei'

export const ShipExitInteraction = () => {
    const { leaveShip } = useShipSync()
    const myId = useMyId()
    const { updateSpawned } = usePlayerStateSyncManager(myId || '')
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const getControlledShip = useShipStore(state => state.getControlledShip)
    const getSpacecraftSpawnPosition = usePlayerStore(state => state.getSpacecraftSpawnPosition)

    const controlledShip = getControlledShip(myId || '')

    const handleExitShip = (interaction: ActiveInteract) => {
        if (!myId || !controlledShip) return

        // Sortir du vaisseau
        leaveShip(controlledShip.id)
        updateSpawned(true) // Respawn le joueur
        setPlayerCamera(myId, true)
        
        console.log(`${myId} sort du vaisseau ${controlledShip.id}`)
    }

    // N'afficher l'interaction que si le joueur contrôle un vaisseau
    if (!controlledShip) return null

    return (
        <InteractiveObjectComponent
            id="ship-exit-interaction"
            type="ship-exit"
            position={controlledShip.position}
            radius={2}
            onInteract={handleExitShip}
            interactionText="Sortir du vaisseau (X)"
            interactionKey="k"
            showText={true}
        >
            {/* Indicateur de sortie */}
            <group position={[0, 0, 0]}>
                <Box args={[0.1, 0.1, 0.1]}>
                    <meshBasicMaterial color="red" />
                </Box>
            </group>
        </InteractiveObjectComponent>
    )
}