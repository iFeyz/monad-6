import React, { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useInteractionStore } from '../Stores/interactStore'
import { useMyId } from 'react-together'
import { InteractionUIManager } from './InteractionUi'

export function InteractionManager() {
    const updateInteractions = useInteractionStore(state => state.updateInteractions)
    const triggerInteractionsForPlayer = useInteractionStore(state => state.triggerInteractionsForPlayer)
    const myId = useMyId()

    // Calcul des interactions à chaque frame
    useFrame(() => {
        updateInteractions()
    })

    // Gestionnaire de clavier global
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase()
            if (myId) {
                triggerInteractionsForPlayer(myId, key)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [myId, triggerInteractionsForPlayer])

    return <InteractionUIManager />
}