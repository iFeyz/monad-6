import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import playerObject from '/player.glb?url'

interface PlayerProps {
  position: [number, number, number]
  nickname: string
  userId: string
  isCurrentUser?: boolean
  color?: string
  rotation: number
}

export function Player({ position, rotation, userId, isCurrentUser = false }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Group>(null)

  // Bobbing animation for the player
  useFrame((state) => {
    if (playerRef.current && !isCurrentUser) {
      playerRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
    
    // Name tag always looks at camera
    if (nameRef.current) {
      nameRef.current.lookAt(state.camera.position)
    }
  })

  const { scene: scence } = useGLTF(playerObject)

  return (
    //TODO ADD ROTATION SYNC
    <group position={position} rotation={[0, rotation, 0]} ref={playerRef}>

      <primitive object={scence.clone()} />
   
      
      {/* Name tag above player */}
      <group position={[0, 2, 0]} ref={nameRef}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {userId}
        </Text>
        {/* Name tag background */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[userId.length * 0.2 + 0.4, 0.6]} />
          <meshBasicMaterial color="black" opacity={0.7} transparent />
        </mesh>
      </group>
    </group>

  )
} 