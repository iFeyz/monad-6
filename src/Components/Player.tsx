import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Vector3 } from 'three'
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'

interface PlayerProps {
  position: [number, number, number]
  nickname: string
  isCurrentUser?: boolean
  color?: string
  rotation: number
}

export function Player({ position, nickname, rotation, isCurrentUser = false, color = '#ff6b6b' }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Group>(null)
  console.log(rotation);

  // Animation de bob pour le joueur
  useFrame((state) => {
    if (playerRef.current) {
      // Bob animation uniquement pour les autres joueurs
      if (!isCurrentUser) {
        playerRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
      }
  
      // ✅ Mise à jour de la rotation (yaw uniquement ici)
      playerRef.current.rotation.y = rotation
    }
  
    if (nameRef.current) {
      nameRef.current.lookAt(state.camera.position)
    }
  })

  return (
    //TODO ADD ROTATION SYNC
    <group position={position} rotation={[0, rotation, 0]} ref={playerRef}>
      {/* Corps du joueur - un simple cube coloré */}

      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Tête du joueur */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Bras gauche */}
      <mesh position={[-0.4, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Bras droit */}
      <mesh position={[0.4, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Jambe gauche */}
      <mesh position={[-0.15, -0.4, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Jambe droite */}
      <mesh position={[0.15, -0.4, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Name tag au-dessus du joueur */}
      <group position={[0, 2, 0]} ref={nameRef}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {nickname}
        </Text>
        {/* Fond du name tag */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[nickname.length * 0.2 + 0.4, 0.6]} />
          <meshBasicMaterial color="black" opacity={0.7} transparent />
        </mesh>
      </group>
    </group>

  )
} 