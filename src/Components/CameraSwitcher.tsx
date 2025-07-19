import { useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { usePlayer } from '../Hooks/usePlayer'
import { usePlayerStore } from '../Stores/playerStore'
import * as THREE from 'three'

export default function CameraSwitcher() {
  const { localPlayer } = usePlayer()
  const setIsPlayerController = usePlayerStore(state => state.setIsPlayerController)
  const orbitCameraRef = useRef<THREE.PerspectiveCamera>(null)
  const { set } = useThree()

  const cameraOptions = useMemo(() => ({ orbit: false }), [])
  const { orbit } = useControls('Camera', cameraOptions)

  useFrame(() => {
    if (orbit && orbitCameraRef.current) {
      set({ camera: orbitCameraRef.current })
    }
  })

useEffect(() => {
  setIsPlayerController(!orbit)
}, [orbit, setIsPlayerController])
  if (!localPlayer) return null

  return (
    <>
      {orbit && (
        <>
      
          <OrbitControls 
            target={[0, 0, 0]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={100}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
        </>
      )}
    </>
  )
}
