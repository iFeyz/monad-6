import React from 'react'
import { SpaceshipSpawner } from './SpawnShipSpawner'
import { SpaceshipInteractions } from './SpaceShipInteraction'
import { ShipExitInteraction } from './ShipExitInteraction'

export const SpaceshipInteractionSystem = () => {
    return (
        <>
            {/* Spawner de vaisseaux */}
            <SpaceshipSpawner />
            
            {/* Interactions pour entrer dans les vaisseaux */}
            <SpaceshipInteractions />
            
            {/* Interaction pour sortir d'un vaisseau */}
            <ShipExitInteraction />
        </>
    )
}
