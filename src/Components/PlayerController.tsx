    import { RigidBody , CapsuleCollider } from "@react-three/rapier"
    import { Player } from "./Player"
    import { useRef, useEffect, useCallback } from "react"
    import { MathUtils, Vector3 } from "three"
    import { useFrame, useThree } from "@react-three/fiber"
    import { useControls } from "leva"
    import { useKeyboardControls } from "@react-three/drei"
    import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore'
    import { useMyId } from "react-together"
    import React from "react"
    import * as THREE from "three"

    export const PlayerController = ({ userId, nickname }: { userId: string, nickname: string }) => {
        const myId = useMyId()
        const isCurrentUser = myId === userId

        // Utilise le nouveau hook unifié pour la synchronisation
        const { 
            player, 
            playerPosition, 
            playerRotation,
            isSpawned,
            updatePosition,  
        } = usePlayerStateSyncManager(userId)

        const spawnPlayer = usePlayerStore(state => state.spawnPlayer)
        const setPlayerController = usePlayerStore(state => state.setPlayerController)
        const getPlayerCamera = usePlayerStore(state => state.getPlayerCamera)
        const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)

        // Hooks doivent être appelés inconditionnellement
        const { WALK_SPEED, ROTATION_SPEED } = useControls("Character Control", {
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
        })

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
        const isPlayerCamera = getPlayerCamera(userId)
        const [, get] = useKeyboardControls()
        const { size, camera } = useThree()

        console.log("isPlayerCamera", isPlayerCamera)

        useEffect(() => {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.fov = 80;
                camera.near = 0.1;
                camera.far = 10000;
                camera.aspect = size.width / size.height;
                camera.updateProjectionMatrix();
                console.log(`Camera FOV: ${camera.fov}, Near: ${camera.near}, Far: ${camera.far}`);
            }
            if (isCurrentUser) {
            //    if (player && !player.isSpawned) {
            //        spawnPlayer(userId)
            //    }
                if (player && !player.isPlayerController) {
                //   setPlayerCamera(userId, true)
                    setPlayerController(userId, true)
                }
            } 
        }, [player, userId, isCurrentUser, spawnPlayer, setPlayerController])

        const normalizeAngle = (angle: number) => {
            while (angle > Math.PI) angle -= Math.PI * 2
            while (angle < -Math.PI) angle += Math.PI * 2
            return angle
        }

        const lerpAngle = (a: number, b: number, t: number) => {
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
        }

        useFrame(({ camera }) => {
            if (!isCurrentUser) return
            if (!rb.current || !character.current) return

            const vel = new Vector3(0, 0, 0)
            const movement = { x: 0, z: 0 }

            if (get().forward) movement.z = 1
            if (get().backward) movement.z = -1
            if (get().left) movement.x = 1
            if (get().right) movement.x = -1

            if (movement.x !== 0) {
                rotationTarget.current += movement.x * ROTATION_SPEED
            }

            if (movement.x !== 0 || movement.z !== 0) {
                playerRotationTarget.current = Math.atan2(movement.x, movement.z)
                vel.x = Math.sin(rotationTarget.current + playerRotationTarget.current) * WALK_SPEED
                vel.z = Math.cos(rotationTarget.current + playerRotationTarget.current) * WALK_SPEED
            }

            character.current.rotation.y = lerpAngle(character.current.rotation.y, playerRotationTarget.current, 0.1)
            rb.current.setLinvel(vel, true)

            if (container.current) {
                container.current.rotation.y = MathUtils.lerp(container.current.rotation.y, rotationTarget.current, 0.1)
            }

            if (cameraPosition.current) {
                cameraPosition.current.getWorldPosition(cameraWorldPosition.current)
                camera.position.lerp(cameraWorldPosition.current, 0.1)
            }

            if (cameraTarget.current) {
                cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current)
                cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1)
                camera.lookAt(cameraLookAt.current)
            }

            const playerWorldPosition = rb.current.translation()
            const currentRotation = character.current.rotation.y

            // If player disconnect ans reconnect
        

            // Utilise la méthode updatePosition du hook unifié
            updatePosition(
                new Vector3(playerWorldPosition.x, playerWorldPosition.y, playerWorldPosition.z),
                currentRotation
            )
        })

        if (!isCurrentUser) {
            if (!isSpawned) return null
            console.log("PlayerController", userId, nickname, isSpawned)
            return (
                <Player
                    position={playerPosition.toArray()}
                    userId={userId}
                    rotation={playerRotation.y}
                    nickname={nickname}
                    isCurrentUser={false}
                    color="red"
                />
            )
        }
        if (!isSpawned) return null

        if(isPlayerCamera) {
            return (
                <RigidBody lockRotations ref={rb}>
                    <group ref={container}>
                        <group ref={cameraTarget} position-z={1} />
                        <group ref={cameraPosition} position-y={4} position-z={-4} />
                        <group ref={character}>
                            <Player
                                position={[0, 0, 0]}
                                userId={userId}
                                rotation={character?.current?.rotation.y || 0}
                                nickname={nickname}
                                isCurrentUser={true}
                                color="blue"
                            />
                        
                        </group>
                    </group>
                </RigidBody>
            ) 
        }
        else {
                return (
                    <group ref={container}>
                        <group ref={character}>
                        <RigidBody  lockRotations ref={rb} gravityScale={10} type="fixed">

                        <mesh>
                            <Player
                                position={[0, 0, 0]}
                                userId={userId}
                                rotation={character?.current?.rotation.y || 0}
                                nickname={nickname}
                                isCurrentUser={true}
                                color="blue"
                            />
                        </mesh>
                        </RigidBody>
                        </group>
                    </group>
            
                )
        }
        

    }