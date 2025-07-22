// CameraManager.tsx - Gestionnaire des transitions de caméra
import React, { useEffect } from 'react'
import { useMyId } from 'react-together'
import { usePlayerStore } from '../Stores/playersStore'
import { useShipStore } from '../Stores/shipStore'
import { useCameraStore } from '../Stores/cameraStore'
import * as THREE from 'three'

export function CameraManager() {
    const myId = useMyId()
    const { setMode, setTargets, forceReset } = useCameraStore()
    
    const player = usePlayerStore(state => state.getPlayer(myId || ''))
    const controlledShip = useShipStore(state => state.getControlledShip(myId || ''))
    
    // Détection des transitions importantes
    useEffect(() => {
        const wasControllingShip = !!controlledShip
        const isPlayerSpawned = player?.isSpawned || false
        
        // Transition vaisseau → joueur
        if (!wasControllingShip && isPlayerSpawned && player?.isPlayerCamera) {
            console.log('Transition: Ship → Player detected')
            const playerPos = player.position || new THREE.Vector3(0, 0, 0)
            const safePos = playerPos.clone().add(new THREE.Vector3(0, 5, -8))
            const lookAt = playerPos.clone().add(new THREE.Vector3(0, 1, 0))
            
            setTargets(safePos, lookAt)
            setMode('player')
            
            // Force reset après un délai
            setTimeout(() => {
                forceReset()
            }, 500)
        }
        
        // Transition joueur → vaisseau
        if (wasControllingShip && !isPlayerSpawned) {
            console.log('Transition: Player → Ship detected')
            const shipPos = controlledShip?.position || new THREE.Vector3(0, 0, 0)
            const safePos = shipPos.clone().add(new THREE.Vector3(0, 3, 10))
            const lookAt = shipPos.clone()
            
            setTargets(safePos, lookAt)
            setMode('ship')
        }
        
    }, [controlledShip, player, setMode, setTargets, forceReset])
    
    return null
}

// Hook pour utiliser facilement le système de caméra
export function useCamera() {
    const myId = useMyId()
    const { currentMode, setMode, forceReset } = useCameraStore()
    
    const switchToPlayer = () => {
        setMode('player')
        usePlayerStore.getState().setPlayerCamera(myId || '', true)
    }
    
    const switchToShip = () => {
        setMode('ship')
    }
    
    const switchToOrbit = () => {
        setMode('orbit')
        usePlayerStore.getState().setPlayerCamera(myId || '', false)
    }
    
    const resetCamera = () => {
        forceReset()
    }
    
    return {
        currentMode,
        switchToPlayer,
        switchToShip,
        switchToOrbit,
        resetCamera
    }
}