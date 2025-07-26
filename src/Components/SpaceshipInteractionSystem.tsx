import React from 'react'
import { SpaceshipSpawner } from './SpawnShipSpawner'
import { SpaceshipInteractions } from './SpaceShipInteraction'
import { ShipExitInteraction } from './ShipExitInteraction'

export const SpaceshipInteractionSystem = () => {
    return (
        <>

            <SpaceshipSpawner />
            

            <SpaceshipInteractions />
            

            <ShipExitInteraction />
        </>
    )
}
