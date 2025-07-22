import { create } from 'zustand'
import * as THREE from 'three'

export type CameraMode = 'player' | 'ship' | 'orbit' | 'free' | 'spectator'

type CameraState = {
    currentMode: CameraMode
    previousMode: CameraMode | null
    isTransitioning: boolean
    targetPosition: THREE.Vector3
    targetLookAt: THREE.Vector3
    targetQuaternion: THREE.Quaternion
    
    // Actions
    setMode: (mode: CameraMode) => void
    setTransitioning: (transitioning: boolean) => void
    setTargets: (position: THREE.Vector3, lookAt: THREE.Vector3, quaternion?: THREE.Quaternion) => void
    forceReset: () => void
}

export const useCameraStore = create<CameraState>((set, get) => ({
    currentMode: 'player',
    previousMode: null,
    isTransitioning: false,
    targetPosition: new THREE.Vector3(0, 5, -10),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    targetQuaternion: new THREE.Quaternion(),
    
    setMode: (mode: CameraMode) => {
        const { currentMode } = get()
        if (currentMode !== mode) {
            console.log(`Camera switching from ${currentMode} to ${mode}`)
            set({
                previousMode: currentMode,
                currentMode: mode,
                isTransitioning: true
            })
        }
    },
    
    setTransitioning: (transitioning: boolean) => {
        set({ isTransitioning: transitioning })
    },
    
    setTargets: (position: THREE.Vector3, lookAt: THREE.Vector3, quaternion?: THREE.Quaternion) => {
        set({
            targetPosition: position.clone(),
            targetLookAt: lookAt.clone(),
            targetQuaternion: quaternion ? quaternion.clone() : new THREE.Quaternion()
        })
    },
    
    forceReset: () => {
        console.log('Camera force reset')
        set({
            isTransitioning: true,
            targetPosition: new THREE.Vector3(0, 5, -10),
            targetLookAt: new THREE.Vector3(0, 0, 0),
            targetQuaternion: new THREE.Quaternion()
        })
    }
}))
