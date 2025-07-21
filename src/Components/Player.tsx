import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF } from '@react-three/drei'
import { Vector3 } from 'three'
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'
import playerObject from '/player.glb?url'

interface PlayerProps {
  position: [number, number, number]
  nickname: string
  userId: string
  isCurrentUser?: boolean
  color?: string
  rotation: number
}

export function Player({ position, nickname, rotation, userId, isCurrentUser = false, color = '#ff6b6b' }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Group>(null)

  // Animation de bob pour le joueur
  useFrame((state) => {
    if (playerRef.current && !isCurrentUser) {
      playerRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
    
    // Le name tag regarde toujours la caméra
    if (nameRef.current) {
      nameRef.current.lookAt(state.camera.position)
    }
  })

  const { scene: scence, nodes , materials } = useGLTF(playerObject)

  return (
    //TODO ADD ROTATION SYNC
    <group position={position} rotation={[0, rotation, 0]} ref={playerRef}>

      <primitive object={scence.clone()} />
   
      
      {/* Name tag au-dessus du joueur */}
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
        {/* Fond du name tag */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[userId.length * 0.2 + 0.4, 0.6]} />
          <meshBasicMaterial color="black" opacity={0.7} transparent />
        </mesh>
      </group>
    </group>

  )
} 