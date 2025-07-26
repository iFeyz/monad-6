import React, { forwardRef, useRef } from 'react'
import { useGLTF } from "@react-three/drei"
import { Vector3 } from "three"
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CoinProps {
    position?: Vector3 | [number, number, number]
}

export const Coin = forwardRef<THREE.Group, CoinProps>(({ position = [0, 0, 0] }, ref) => {
    const coin = useGLTF("/coin.glb")
    const groupRef = useRef<THREE.Group>(null)
    
    // Rotation animation for the coin
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.02
            // Floating animation
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
        }
    })
    
    // Use passed ref or internal ref
    const finalRef = ref || groupRef

    const positionArray = Array.isArray(position) 
        ? position 
        : [position.x, position.y, position.z]

    return (
        <group ref={finalRef} position={positionArray as [number, number, number]}>
            <primitive object={coin.scene.clone()} scale={0.5} />
        </group>
    )
})

Coin.displayName = 'Coin'
