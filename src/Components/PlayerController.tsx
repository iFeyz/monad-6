import { RigidBody } from "@react-three/rapier"
import { Player } from "./Player"
import { useRef, useEffect, useCallback, useMemo } from "react"
import { MathUtils, Vector3 } from "three"
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
        }
    }), [])

    // === OTHER HOOKS (MUST BE CALLED UNCONDITIONALLY) ===
    const { WALK_SPEED, ROTATION_SPEED } = useControls("Character Control", controlsConfig)
    const [, get] = useKeyboardControls()
    const { size, camera } = useThree()

    // Remove problematic debugging console.log
    // console.log("PlayerController - userId:", userId, "isPlayerCamera:", isPlayerCamera, "isSpawned:", isSpawned)

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

    // Remove the configureCameraPerspective function as it was causing issues
    // const configureCameraPerspective = useCallback(() => {
    //     if (camera instanceof THREE.PerspectiveCamera) {
    //         camera.fov = 80
    //         camera.near = 0.1
    //         camera.far = 10000
    //         camera.aspect = size.width / size.height
    //         camera.updateProjectionMatrix()
    //     }
    // }, [camera, size.width, size.height])

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

        // CRITICAL: Activate camera when player spawns (this was missing!)
        if (isCurrentUser && isSpawned && !isPlayerCamera) {
            console.log("Activating player camera for spawned player:", userId)
            setPlayerCamera(userId, true)
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
        size.height
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
        if (controls.left) movement.x = 1
        if (controls.right) movement.x = -1

        // Apply rotation input
        if (movement.x !== 0) {
            rotationTarget.current += movement.x * ROTATION_SPEED
        }

        // Calculate movement velocity
        if (movement.x !== 0 || movement.z !== 0) {
            playerRotationTarget.current = Math.atan2(movement.x, movement.z)
            vel.x = Math.sin(rotationTarget.current + playerRotationTarget.current) * WALK_SPEED
            vel.z = Math.cos(rotationTarget.current + playerRotationTarget.current) * WALK_SPEED
        }

        // Apply character rotation with smooth interpolation
        character.current.rotation.y = lerpAngle(character.current.rotation.y, playerRotationTarget.current, 0.1)
        
        // Apply physics velocity
        rb.current.setLinvel(vel, true)

        // Update container rotation (camera follows this)
        if (container.current) {
            container.current.rotation.y = MathUtils.lerp(container.current.rotation.y, rotationTarget.current, 0.1)
        }

        // Update camera position and target (ONLY if this player's camera is active)
        if (isPlayerCamera) {
            if (cameraPosition.current) {
                cameraPosition.current.getWorldPosition(cameraWorldPosition.current)
                camera.position.lerp(cameraWorldPosition.current, 0.1)
            }

            if (cameraTarget.current) {
                cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current)
                cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1)
                camera.lookAt(cameraLookAt.current)
            }
        }

        // Update player position in store for synchronization
        const playerWorldPosition = rb.current.translation()
        const currentRotation = character.current.rotation.y
        updatePosition(
            new Vector3(playerWorldPosition.x, playerWorldPosition.y, playerWorldPosition.z),
            currentRotation
        )
    }, [isCurrentUser, get, ROTATION_SPEED, WALK_SPEED, lerpAngle, updatePosition, isPlayerCamera])

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
        // Third-person camera setup with positioned camera nodes
        return (
            <RigidBody lockRotations ref={rb}>
                <group ref={container}>
                    <group ref={cameraTarget} position-z={1} />
                    <group ref={cameraPosition} position-y={4} position-z={-4} />
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