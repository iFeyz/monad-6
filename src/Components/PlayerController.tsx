import { useEffect, useRef } from 'react'
import { useStateTogether } from 'react-together'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

interface PlayerControllerProps {
  userId: string
  nickname: string
}

export function PlayerController({ userId, nickname }: PlayerControllerProps) {
  const [playerPosition, setPlayerPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
  const keysPressed = useRef<Set<string>>(new Set())
  const { camera } = useThree()
  
  // Gestion des touches
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current.add(event.code)
    }
    
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.code)
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Mouvement et caméra 3e personne
  useFrame((state, delta) => {
    const speed = 5
    const newPosition = [...playerPosition] as [number, number, number]
    let moved = false

    // Mouvement basé sur les touches
    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) {
      newPosition[2] -= speed * delta
      moved = true
    }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) {
      newPosition[2] += speed * delta
      moved = true
    }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) {
      newPosition[0] -= speed * delta
      moved = true
    }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) {
      newPosition[0] += speed * delta
      moved = true
    }
    if (keysPressed.current.has('Space')) {
      newPosition[1] += speed * delta
      moved = true
    }
    if (keysPressed.current.has('ShiftLeft')) {
      newPosition[1] -= speed * delta
      moved = true
    }

    // Limites de mouvement
    newPosition[0] = Math.max(-10, Math.min(10, newPosition[0]))
    newPosition[1] = Math.max(0, Math.min(10, newPosition[1]))
    newPosition[2] = Math.max(-10, Math.min(10, newPosition[2]))

    if (moved) {
      setPlayerPosition(newPosition)
    }

    // Caméra 3e personne
    const cameraDistance = 8
    const cameraHeight = 3
    const targetPosition = new Vector3(
      newPosition[0] + cameraDistance * Math.sin(state.clock.elapsedTime * 0.1),
      newPosition[1] + cameraHeight,
      newPosition[2] + cameraDistance * Math.cos(state.clock.elapsedTime * 0.1)
    )
    
   // camera.position.lerp(targetPosition, delta * 2)
    camera.lookAt(new Vector3(newPosition[0], newPosition[1] + 1, newPosition[2]))
  })

  return null
} 