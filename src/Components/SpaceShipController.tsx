import { RigidBody } from "@react-three/rapier"
import { useRef, useEffect, useCallback, useMemo } from "react"
import { Vector3, Quaternion, Matrix4, Euler } from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls } from "@react-three/drei"
import { useControls } from "leva"
import * as THREE from 'three'
import { useShipStore } from '@/Stores/shipStore'
import { RapierRigidBody } from '@react-three/rapier'
import React from "react"
import RocketThrust from "./RocketThrust"

type ShipControlledProps = {
    shipId: string;
    initialPosition: Vector3;
    initialRotation: Euler;
}

export const ShipController = React.memo(({ shipId }: ShipControlledProps) => {
    // === ALL REFS FIRST (MUST BE CALLED UNCONDITIONALLY) ===
    const rb = useRef<RapierRigidBody>(null)
    const cameraRig = useRef<any>(null)
    const targetDirection = useRef(new Vector3(0, 0, -1))
    const currentRotation = useRef(new Quaternion())
    const thrust = useRef(new Vector3())
    const shaderRef = useRef<any>(null)
    const viewRotation = useRef(new Euler(0, 0, 0, 'YXZ'))

    // === STORE HOOKS (MUST BE CALLED UNCONDITIONALLY) ===
    // Memoized store selectors to prevent re-renders
    const shipStoreSelectors = useMemo(() => ({
        getShip: (state: any) => state.getShip(shipId),
        updateShipPosition: (state: any) => state.updateShipPosition,
        updateShipRotation: (state: any) => state.updateShipRotation,
    }), [shipId])

    const ship = useShipStore(shipStoreSelectors.getShip)
    const updateShipPosition = useShipStore(shipStoreSelectors.updateShipPosition)
    const updateShipRotation = useShipStore(shipStoreSelectors.updateShipRotation)

    // === MEMOIZED VALUES ===
    // Stable controls configuration to prevent re-renders
    const controlsConfig = useMemo(() => ({
        THRUST_POWER: { value: 75 },
        MOUSE_SENSITIVITY: { value: 1 },
        STRAFE_POWER: { value: 8 },
        VERTICAL_POWER: { value: 8 },
        LINEAR_DAMPING: { value: 0.8 },
        ANGULAR_DAMPING: { value: 0.9 },
        BOOST_MULTIPLIER: { value: 2.5 },
        ROTATION_SPEED: { value: 2 },
        ROLL_SPEED: { value: 1.5 },
        CAMERA_OFFSET_Z: { value: 35 },
        CAMERA_OFFSET_Y: { value: 5 }
    }), [])

    const {
        THRUST_POWER,
        MOUSE_SENSITIVITY,
        STRAFE_POWER,
        VERTICAL_POWER,
        LINEAR_DAMPING,
        BOOST_MULTIPLIER,
        ROTATION_SPEED,
        ROLL_SPEED,
        CAMERA_OFFSET_Z,
        CAMERA_OFFSET_Y
    } = useControls("ShipControlled", controlsConfig)

    // === OTHER HOOKS (MUST BE CALLED UNCONDITIONALLY) ===
    const [, get] = useKeyboardControls()
    const { size, camera } = useThree()

    // === MEMOIZED UTILITY FUNCTIONS ===
    const configureCameraPerspective = useCallback(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 80
            camera.near = 0.1
            camera.far = 1000
            camera.aspect = size.width / size.height
            camera.updateProjectionMatrix()
        }
    }, [camera, size.width, size.height])

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (document.pointerLockElement !== document.querySelector('canvas')) return
        
        const deltaX = event.movementX || 0
        const deltaY = event.movementY || 0
        
        // Update pitch and yaw
        viewRotation.current.y -= deltaX * 0.0025 * MOUSE_SENSITIVITY // yaw
        viewRotation.current.x -= deltaY * 0.0025 * MOUSE_SENSITIVITY // pitch
        
        // Clamp pitch to avoid flipping (e.g., -89° to 89°)
        const maxPitch = Math.PI / 2 - 0.01
        const minPitch = -Math.PI / 2 + 0.01
        viewRotation.current.x = Math.max(minPitch, Math.min(maxPitch, viewRotation.current.x))
        
        // Recalculate target direction from rotation
        targetDirection.current.set(0, 0, -1).applyEuler(viewRotation.current)
    }, [MOUSE_SENSITIVITY])

    // === EFFECTS (MUST BE CALLED UNCONDITIONALLY) ===
    useEffect(() => {
        configureCameraPerspective()
        
        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [configureCameraPerspective, handleMouseMove])

    // === FRAME LOOP (MUST BE CALLED UNCONDITIONALLY) ===
    const frameCallback = useCallback(({ clock }: any) => {
        if (!rb.current) return

        // Update shader time
        if (shaderRef.current) {
            shaderRef.current.uniforms.time.value = clock.getElapsedTime()
        }

        const controls = get()
        thrust.current.set(0, 0, 0)

        const shipPos = rb.current.translation()
        const shipPosition = new Vector3(shipPos.x, shipPos.y, shipPos.z)

        // === SHIP ROTATION LOGIC ===
        const target = targetDirection.current.clone()
        const up = new Vector3(0, 1, 0)
        const targetPos = shipPosition.clone().add(target)

        const lookMatrix = new Matrix4().lookAt(shipPosition, targetPos, up)
        const desiredQuat = new Quaternion().setFromRotationMatrix(lookMatrix)

        // Add roll input
        let rollInput = 0
        if (controls.rollLeft) rollInput -= ROLL_SPEED * 0.02
        if (controls.rollRight) rollInput += ROLL_SPEED * 0.02
        if (rollInput !== 0) {
            const rollQuat = new Quaternion().setFromAxisAngle(target, rollInput)
            desiredQuat.multiply(rollQuat)
        }

        // Apply rotation smoothly
        const currentQuat = rb.current.rotation()
        currentRotation.current.set(currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w)
        currentRotation.current.slerp(desiredQuat, ROTATION_SPEED * 0.02)
        rb.current.setRotation(currentRotation.current, true)

        // === SHIP MOVEMENT LOGIC ===
        const boostActive = controls.boost || controls.shift
        const boostMultiplier = boostActive ? BOOST_MULTIPLIER : 1

        // Apply thrust based on controls
        if (controls.forward) thrust.current.z = -THRUST_POWER * boostMultiplier
        if (controls.backward) thrust.current.z = THRUST_POWER * 0.5 * boostMultiplier
        if (controls.left) thrust.current.x = -STRAFE_POWER * boostMultiplier
        if (controls.right) thrust.current.x = STRAFE_POWER * boostMultiplier
        if (controls.up || controls.jump) thrust.current.y = VERTICAL_POWER * boostMultiplier
        if (controls.down || controls.run) thrust.current.y = -VERTICAL_POWER * boostMultiplier

        // Transform thrust to world space and apply physics
        const worldThrust = thrust.current.clone().applyQuaternion(currentRotation.current)
        const currentVel = rb.current.linvel()
        const newVelocity = new Vector3(currentVel.x, currentVel.y, currentVel.z)
        newVelocity.add(worldThrust.multiplyScalar(0.1))
        newVelocity.multiplyScalar(1 - LINEAR_DAMPING * 0.1)
        rb.current.setLinvel(newVelocity, true)

        // === UPDATE STORE (ONLY ON SIGNIFICANT CHANGE) ===
        const currentRbRotation = new Euler().setFromQuaternion(currentRotation.current)
        if (ship && ship.position.distanceTo(shipPosition) > 0.3) {
            updateShipPosition(shipId, shipPosition)
            updateShipRotation(shipId, currentRbRotation)
        }

        // === CAMERA FOLLOW LOGIC ===
        const cameraOffset = new Vector3(0, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z)
        .applyQuaternion(currentRotation.current)
    const cameraTargetPos = shipPosition.clone().add(cameraOffset)
    
    // Smoother interpolation to avoid jerks
    camera.position.lerp(cameraTargetPos, 0.1)
    camera.quaternion.slerp(currentRotation.current, 0.1)
    
    // Force full camera update
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    
    // Manual frustum update for distant objects
    const frustum = new THREE.Frustum()
    const cameraMatrix = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(cameraMatrix)
    }, [
        get,
        THRUST_POWER,
        STRAFE_POWER, 
        VERTICAL_POWER,
        LINEAR_DAMPING,
        BOOST_MULTIPLIER,
        ROTATION_SPEED,
        ROLL_SPEED,
        CAMERA_OFFSET_Z,
        CAMERA_OFFSET_Y,
        ship,
        shipId,
        updateShipPosition,
        updateShipRotation,
        camera
    ])

    useFrame(frameCallback)





    // === RENDER (NO EARLY RETURNS NEEDED) ===
    return (
        <RigidBody
            ref={rb}    
            colliders={false}
            scale={5}
            gravityScale={0.1}
            enabledRotations={[true, true, true]}
            enabledTranslations={[true, true, true]}
            
        >
            <group ref={cameraRig}>
                {/*SpaceshipModel*/}
                <RocketThrust />
         
            </group>
        </RigidBody>
    )
})

ShipController.displayName = 'ShipController'