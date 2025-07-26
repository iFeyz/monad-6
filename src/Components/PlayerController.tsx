import { RigidBody } from "@react-three/rapier"
import { Player } from "./Player"
import { useRef, useEffect, useCallback, useMemo } from "react"
import { MathUtils, Vector3, Euler, Spherical } from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { useControls } from "leva"
import { useKeyboardControls } from "@react-three/drei"
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore'
import { useMyId } from "react-together"
import React from "react"
import * as THREE from "three"
import { useShipStore, useShipSync } from "@/Stores/shipStore"

export const PlayerController = React.memo(({ userId, nickname }: { userId: string, nickname: string }) => {
    const myId = useMyId()
    const isCurrentUser = myId === userId

    // === ALL REFS FIRST (MUST BE CALLED UNCONDITIONALLY) ===
    const rb = useRef<any>(null)
    const container = useRef<any>(null)
    const rotationTarget = useRef(0)
    const cameraTarget = useRef<any>(null)
    const cameraPosition = useRef<any>(null)
    const character = useRef<any>(null)
    const cameraWorldPosition = useRef(new Vector3())
    const cameraLookAtWorldPosition = useRef(new Vector3())
    const cameraLookAt = useRef(new Vector3())
    const playerRotationTarget = useRef(0)
    
    // === ORBIT CAMERA REFS ===
    const orbitAngle = useRef({ theta: 0, phi: Math.PI / 4 }) // theta = horizontal, phi = vertical
    const orbitDistance = useRef(8)
    const orbitTarget = useRef(new Vector3())
    const spherical = useRef(new Spherical())

    // === ALL STORE HOOKS (MUST BE CALLED UNCONDITIONALLY) ===
    const { 
        player, 
        playerPosition, 
        playerRotation,
        isSpawned,
        updatePosition,  
    } = usePlayerStateSyncManager(userId)

    // Memoized store selectors to prevent re-renders - SIMPLIFIED
    const spawnPlayer = usePlayerStore(state => state.spawnPlayer)
    const setPlayerController = usePlayerStore(state => state.setPlayerController)
    const getPlayerCamera = usePlayerStore(state => state.getPlayerCamera)
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const possibleShipControlled = useShipStore(state => state.getControlledShip(userId))
    const { leaveShip } = useShipSync()

    // === MEMOIZED VALUES ===
    const isPlayerCamera = getPlayerCamera(userId)

    // Stable controls configuration
    const controlsConfig = useMemo(() => ({
        WALK_SPEED: {
            value: 5,
            min: 0,
            max: 10,
            step: 0.1,
        },
        ROTATION_SPEED: {
            value: 0.02,
            min: 0,
            max: 1,
            step: 0.01,
        },
        // === ORBIT CAMERA CONTROLS ===
        ORBIT_SENSITIVITY: {
            value: 0.005,
            min: 0.001,
            max: 0.02,
            step: 0.001,
        },
        ZOOM_SPEED: {
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
        },
        MIN_DISTANCE: {
            value: 2,
            min: 1,
            max: 10,
            step: 0.5,
        },
        MAX_DISTANCE: {
            value: 20,
            min: 10,
            max: 50,
            step: 1,
        },
        MIN_POLAR_ANGLE: {
            value: 0.1,
            min: 0,
            max: Math.PI / 2,
            step: 0.1,
        },
        MAX_POLAR_ANGLE: {
            value: Math.PI - 0.1,
            min: Math.PI / 2,
            max: Math.PI,
            step: 0.1,
        }
    }), [])

    // === OTHER HOOKS (MUST BE CALLED UNCONDITIONALLY) ===
    const { 
        WALK_SPEED, 
        ROTATION_SPEED,
        ORBIT_SENSITIVITY,
        ZOOM_SPEED,
        MIN_DISTANCE,
        MAX_DISTANCE,
        MIN_POLAR_ANGLE,
        MAX_POLAR_ANGLE
    } = useControls("Character Control", controlsConfig)
    const [, get] = useKeyboardControls()
    const { size, camera } = useThree()

    // === MEMOIZED UTILITY FUNCTIONS ===
    const normalizeAngle = useCallback((angle: number) => {
        while (angle > Math.PI) angle -= Math.PI * 2
        while (angle < -Math.PI) angle += Math.PI * 2
        return angle
    }, [])

    const lerpAngle = useCallback((a: number, b: number, t: number) => {
        a = normalizeAngle(a)
        b = normalizeAngle(b)
        if (Math.abs(b - a) > Math.PI) {
            if (b > a) {
                a += Math.PI * 2
            } else {
                b += Math.PI * 2
            }
        }
        return normalizeAngle(a + (b - a) * t)
    }, [normalizeAngle])

    // === ORBIT CAMERA MOUSE HANDLER ===
    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isPlayerCamera || document.pointerLockElement !== document.querySelector('canvas')) return
        
        const deltaX = event.movementX || 0
        const deltaY = event.movementY || 0
        
        // Update orbit angles
        orbitAngle.current.theta -= deltaX * ORBIT_SENSITIVITY
        orbitAngle.current.phi += deltaY * ORBIT_SENSITIVITY
        
        // Clamp vertical angle
        orbitAngle.current.phi = Math.max(MIN_POLAR_ANGLE, Math.min(MAX_POLAR_ANGLE, orbitAngle.current.phi))
    }, [isPlayerCamera, ORBIT_SENSITIVITY, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE])

    // === ORBIT CAMERA WHEEL HANDLER ===
    const handleWheel = useCallback((event: WheelEvent) => {
        if (!isPlayerCamera) return
        
        event.preventDefault()
        const delta = event.deltaY > 0 ? 1 : -1
        orbitDistance.current += delta * ZOOM_SPEED
        orbitDistance.current = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, orbitDistance.current))
    }, [isPlayerCamera, ZOOM_SPEED, MIN_DISTANCE, MAX_DISTANCE])

    // === EFFECTS (MUST BE CALLED UNCONDITIONALLY) ===
    useEffect(() => {
        // Leave ship if player is controlling one and gets spawned
        if (possibleShipControlled?.id && player?.isPlayerController && player?.isSpawned) {
            leaveShip(possibleShipControlled.id)
            setPlayerCamera(userId, true)
        }

        // Configure camera perspective
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 80
            camera.near = 0.1
            camera.far = 10000
            camera.aspect = size.width / size.height
            camera.updateProjectionMatrix()
        }

        // Set player as controller for current user
        if (isCurrentUser && player && !player.isPlayerController) {
            setPlayerController(userId, true)
        }

        // CRITICAL: Activate camera when player spawns
        if (isCurrentUser && isSpawned && !isPlayerCamera) {
            console.log("Activating player camera for spawned player:", userId)
            setPlayerCamera(userId, true)
        }

        // Add orbit camera event listeners
        if (isPlayerCamera) {
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("wheel", handleWheel, { passive: false })
            
            return () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("wheel", handleWheel)
            }
        }
    }, [
        possibleShipControlled?.id, 
        player?.isPlayerController, 
        player?.isSpawned,
        isCurrentUser, 
        userId, 
        isSpawned,
        isPlayerCamera,
        leaveShip,
        setPlayerCamera,
        setPlayerController,
        camera,
        size.width, 
        size.height,
        handleMouseMove,
        handleWheel
    ])

    // === FRAME LOOP (MUST BE CALLED UNCONDITIONALLY) ===
    const frameCallback = useCallback(({ camera }: any) => {
        // Early return if not current user or refs not ready
        if (!isCurrentUser || !rb.current || !character.current) return

        const vel = new Vector3(0, 0, 0)
        const movement = { x: 0, z: 0 }

        // Get keyboard input
        const controls = get()
        if (controls.forward) movement.z = 1
        if (controls.backward) movement.z = -1
        if (controls.left) movement.x = -1
        if (controls.right) movement.x = 1

        // Calculate movement based on camera orientation
        if (movement.x !== 0 || movement.z !== 0) {
            // Get camera's horizontal orientation (ignore vertical tilt)
            const cameraDirection = new Vector3()
            camera.getWorldDirection(cameraDirection)
            
            // Project camera direction onto horizontal plane
            cameraDirection.y = 0
            cameraDirection.normalize()
            
            // Calculate right vector (perpendicular to camera direction)
            const rightVector = new Vector3().crossVectors(cameraDirection, new Vector3(0, 1, 0)).normalize()
            
            // Calculate movement direction based on input and camera orientation
            const moveDirection = new Vector3()
            moveDirection.addScaledVector(cameraDirection, movement.z) // Forward/backward
            moveDirection.addScaledVector(rightVector, movement.x)     // Left/right
            moveDirection.normalize()
            
            // Apply movement velocity
            vel.x = moveDirection.x * WALK_SPEED
            vel.z = moveDirection.z * WALK_SPEED
            
            // Make character face movement direction
            if (moveDirection.length() > 0.1) {
                playerRotationTarget.current = Math.atan2(moveDirection.x, moveDirection.z)
            }
        }

        // Apply character rotation with smooth interpolation
        character.current.rotation.y = lerpAngle(character.current.rotation.y, playerRotationTarget.current, 0.1)
        
        // Apply physics velocity
        rb.current.setLinvel(vel, true)

        // Update container rotation (no longer needed for camera-relative movement)
        // Container rotation is now independent of movement
        if (container.current) {
            // Optional: You can remove this or use it for other purposes
            // container.current.rotation.y = MathUtils.lerp(container.current.rotation.y, rotationTarget.current, 0.1)
        }

        // === ORBIT CAMERA UPDATE ===
        if (isPlayerCamera) {
            // Get player world position as orbit target
            const playerWorldPosition = rb.current.translation()
            orbitTarget.current.set(playerWorldPosition.x, playerWorldPosition.y + 1.5, playerWorldPosition.z) // Offset Y pour viser le centre du joueur
            
            // Calculate camera position using spherical coordinates
            spherical.current.set(
                orbitDistance.current,
                orbitAngle.current.phi,
                orbitAngle.current.theta
            )
            
            // Convert to cartesian and add to target position
            const cameraPos = new Vector3().setFromSpherical(spherical.current)
            cameraPos.add(orbitTarget.current)
            
            // Smooth camera movement
            camera.position.lerp(cameraPos, 0.1)
            camera.lookAt(orbitTarget.current)
            
            // Force camera matrix update
            camera.updateMatrixWorld(true)
        }

        // Update player position in store for synchronization
        const playerWorldPosition = rb.current.translation()
        const currentRotation = character.current.rotation.y
        updatePosition(
            new Vector3(playerWorldPosition.x, playerWorldPosition.y, playerWorldPosition.z),
            currentRotation
        )
    }, [
        isCurrentUser, 
        get, 
        ROTATION_SPEED, 
        WALK_SPEED, 
        lerpAngle, 
        updatePosition, 
        isPlayerCamera
    ])

    useFrame(frameCallback)

    // === MEMOIZED COMPONENTS (TO PREVENT UNNECESSARY RE-RENDERS) ===
    const CurrentUserPlayerComponent = useMemo(() => (
        <Player
            position={[0, 0, 0]}
            userId={userId}
            rotation={character?.current?.rotation.y || 0}
            nickname={nickname}
            isCurrentUser={true}
            color="blue"
        />
    ), [userId, nickname])

    const RemotePlayerComponent = useMemo(() => (
        <Player
            position={playerPosition.toArray()}
            userId={userId}
            rotation={playerRotation.y}
            nickname={nickname}
            isCurrentUser={false}
            color="red"
        />
    ), [playerPosition, userId, playerRotation.y, nickname])

    // === EARLY RETURNS (ONLY AFTER ALL HOOKS) ===
    if (!isCurrentUser) {
        if (!isSpawned) return null
        return RemotePlayerComponent
    }

    if (!isSpawned) return null

    // === CONDITIONAL RENDERING BASED ON CAMERA STATE ===
    if (isPlayerCamera) {
        // Orbit camera setup - plus besoin des nodes de caméra fixes
        return (
            <RigidBody lockRotations ref={rb}>
                <group ref={container}>
                    <group ref={character}>
                        {CurrentUserPlayerComponent}
                    </group>
                </group>
            </RigidBody>
        )
    } else {
        // Fixed camera setup (player not controlling camera)
        return (
            <group ref={container}>
                <group ref={character}>
                    <RigidBody lockRotations ref={rb} gravityScale={10} type="fixed">
                        <mesh>
                            {CurrentUserPlayerComponent}
                        </mesh>
                    </RigidBody>
                </group>
            </group>
        )
    }
})

PlayerController.displayName = 'PlayerController'