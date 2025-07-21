import React, { useState } from 'react'
import { Vector3 } from 'three'
import { InteractiveObjectComponent } from './InteractiveObjectComponent'
import { usePlayerStore } from '../Stores/playersStore'
import { Box, Cylinder, Sphere } from '@react-three/drei'
import type { ActiveInteract } from '../Stores/interactStore'

export const InteractiveObjects = () => {
    const handleInteract = (interaction: ActiveInteract) => {
        console.log('Interact with object', interaction)
    }

    return (
        <>
        <InteractiveObjectComponent
            id="test-00"
            type="test"
            position={new Vector3(0, 0, 0)}
            radius={2}
            onInteract={handleInteract}
            interactionText={"Interaction Test"}
            interactionKey="f"
            onEnter={(interaction) => {
                console.log('Entering interaction', interaction)
            }}
            showDebugRadius={true}
        >
             <Box args={[0.3, 2, 1.5]} position={[0, 0, 0]}>
                    <meshStandardMaterial color={"red"} />
                </Box>
        </InteractiveObjectComponent>
        </>
    )
}