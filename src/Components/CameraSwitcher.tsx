import { useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { usePlayer } from '../Hooks/usePlayer'
import { usePlayerStore } from '../Stores/playersStore'
import * as THREE from 'three'
import { useMyId } from 'react-together'

export default function CameraSwitcher() {
  const { localPlayer } = usePlayer()
  const myId = useMyId()
  const isDespawned = usePlayerStore(state => state.getPlayer(myId || "")?.isDespawned)
  const setIsPlayerController = usePlayerStore(state => state.setPlayerController)
  const setIsPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
  const orbitCameraRef = useRef<THREE.PerspectiveCamera>(null)
  const { set } = useThree()

  const cameraOptions = useMemo(() => ({ orbit: false }), [])
  const { orbit } = useControls('Camera', cameraOptions)
  const isPlayerCamera = usePlayerStore(state => state.getPlayerCamera(myId || ""))

  useFrame(() => {
    if (orbit && orbitCameraRef.current) {
      set({ camera: orbitCameraRef.current })
    }
  })

useEffect(() => {
  setIsPlayerController(localPlayer?.userId!, !orbit)
  setIsPlayerCamera(localPlayer?.userId!, !orbit)
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
