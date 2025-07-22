import React from 'react'
import { Vector3, Euler } from 'three'
import { useInteractiveObject, type ActiveInteract } from '../Stores/interactStore'

interface InteractiveObjectProps {
    id: string
    type: string
    position: Vector3 | [number, number, number]
    rotation?: Euler | [number, number, number]
    scale?: Vector3 | [number, number, number]
    radius?: number
    interactionText?: string
    showText?: boolean
    interactionKey?: string
    onInteract?: (interaction: ActiveInteract) => void
    onEnter?: (interaction: ActiveInteract) => void
    onExit?: () => void
    customUI?: (interaction: ActiveInteract) => React.ReactNode
    enabled?: boolean
    metadata?: Record<string, any>
    showDebugRadius?: boolean
    children: React.ReactNode
    [key: string]: any
}

export function InteractiveObjectComponent({
    id,
    type,
    position,
    rotation,
    scale,
    radius = 1,
    interactionText,
    showText = true,
    interactionKey = 'e',
    onInteract,
    onEnter,
    onExit,
    customUI,
    enabled = true,
    metadata = {},
    showDebugRadius = false,
    children,
    ...props
}: InteractiveObjectProps) {
    const { isNearby, playersNearby } = useInteractiveObject({
        id,
        type,
        position,
        rotation,
        scale,
        radius,
        interactionText,
        showText,
        interactionKey,
        onInteract,
        onEnter,
        onExit,
        customUI,
        enabled,
        metadata
    })

    const positionArray = Array.isArray(position) ? position : [position.x, position.y, position.z]

    return (
        <group position={positionArray as [number, number, number]} {...props}>
            {children}
            
            {(showDebugRadius || isNearby) && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[radius - 0.1, radius, 32]} />
                    <meshBasicMaterial 
                        color={isNearby ? "green" : "yellow"} 
                        transparent 
                        opacity={0.3} 
                    />
                </mesh>
            )}
            
            {playersNearby.length > 0 && (
                <mesh position={[0, radius + 0.5, 0]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="cyan" />
                </mesh>
            )}
        </group>
    )
}