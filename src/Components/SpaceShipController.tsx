import { RigidBody } from "@react-three/rapier"
import { useRef, useEffect } from "react"
import { Vector3, Euler, Quaternion, Matrix4 } from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls, useGLTF } from "@react-three/drei"
import { useControls } from "leva"
import manta from "/manta.glb?url"

export default function SpaceShipController() {
    const {
        THRUST_POWER,
        MOUSE_SENSITIVITY,
        STRAFE_POWER,
        VERTICAL_POWER,
        LINEAR_DAMPING,
        ANGULAR_DAMPING,
        BOOST_MULTIPLIER,
        ROTATION_SPEED,
        ROLL_SPEED,
        CAMERA_OFFSET_Z,
        CAMERA_OFFSET_Y
    } = useControls("SpaceShipController", {
        THRUST_POWER: { value: 15 },
        MOUSE_SENSITIVITY: { value: 10 },
        STRAFE_POWER: { value: 8 },
        VERTICAL_POWER: { value: 8 },
        LINEAR_DAMPING: { value: 0.8 },
        ANGULAR_DAMPING: { value: 0.9 },
        BOOST_MULTIPLIER: { value: 2.5 },
        ROTATION_SPEED: { value: 2 },
        ROLL_SPEED: { value: 1.5 },
        CAMERA_OFFSET_Z: { value: 20 },
        CAMERA_OFFSET_Y: { value: 0 }
    })

    const rb = useRef<any>(null)
    const spaceshipGroup = useRef<any>(null)
    const cameraRig = useRef<any>(null)

    const mousePosition = useRef({ x: 0, y: 0 })
    const targetDirection = useRef(new Vector3(0, 0, -1))
    const currentRotation = useRef(new Quaternion())

    const thrust = useRef(new Vector3())
    const [, get] = useKeyboardControls()

    const { scene: spaceshipScene } = useGLTF(manta)
    const { size, camera } = useThree()

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            const x = (event.clientX / size.width) * 2 - 1
            const y = -(event.clientY / size.height) * 2 + 1

            mousePosition.current = { x, y }

            const pitch = y * MOUSE_SENSITIVITY * 0.25
            const yaw = x * MOUSE_SENSITIVITY * 0.25

            const direction = new Vector3(
                Math.sin(yaw) * Math.cos(pitch),
                Math.sin(pitch),
                -Math.cos(yaw) * Math.cos(pitch)
            )

            targetDirection.current.copy(direction.normalize())
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [MOUSE_SENSITIVITY, size.width, size.height])

    useFrame(() => {
        if (!rb.current) return

        const controls = get()
        thrust.current.set(0, 0, 0)

        const shipPos = rb.current.translation()
        const shipPosition = new Vector3(shipPos.x, shipPos.y, shipPos.z)

        // Rotation vers la direction cible avec matrice de look
        const target = targetDirection.current.clone()
        const up = new Vector3(0, 1, 0)
        const targetPos = shipPosition.clone().add(target)

        const lookMatrix = new Matrix4().lookAt(shipPosition, targetPos, up)
        const desiredQuat = new Quaternion().setFromRotationMatrix(lookMatrix)

        // Ajouter le roll
        let rollInput = 0
        if (controls.rollLeft) rollInput -= ROLL_SPEED * 0.02
        if (controls.rollRight) rollInput += ROLL_SPEED * 0.02
        if (rollInput !== 0) {
            const rollQuat = new Quaternion().setFromAxisAngle(target, rollInput)
            desiredQuat.multiply(rollQuat)
        }

        const currentQuat = rb.current.rotation()
        currentRotation.current.set(currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w)
        currentRotation.current.slerp(desiredQuat, ROTATION_SPEED * 0.02)
        rb.current.setRotation(currentRotation.current, true)

        // Mouvement
        const boostActive = controls.boost || controls.shift
        const boostMultiplier = boostActive ? BOOST_MULTIPLIER : 1

        if (controls.forward) thrust.current.z = -THRUST_POWER * boostMultiplier
        if (controls.backward) thrust.current.z = THRUST_POWER * 0.5 * boostMultiplier
        if (controls.left) thrust.current.x = -STRAFE_POWER * boostMultiplier
        if (controls.right) thrust.current.x = STRAFE_POWER * boostMultiplier
        if (controls.up || controls.jump) thrust.current.y = VERTICAL_POWER * boostMultiplier
        if (controls.down || controls.run) thrust.current.y = -VERTICAL_POWER * boostMultiplier

        const worldThrust = thrust.current.clone().applyQuaternion(currentRotation.current)
        const currentVel = rb.current.linvel()
        const newVelocity = new Vector3(currentVel.x, currentVel.y, currentVel.z)
        newVelocity.add(worldThrust.multiplyScalar(0.1))
        newVelocity.multiplyScalar(1 - LINEAR_DAMPING * 0.1)
        rb.current.setLinvel(newVelocity, true)

        // Caméra
        const cameraTargetPos = shipPosition.clone().add(
            new Vector3(0, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z).applyQuaternion(currentRotation.current)
        )
        camera.position.lerp(cameraTargetPos, 0.05)
        camera.quaternion.slerp(currentRotation.current, 0.05)
    })

    return (
        
        <RigidBody
            ref={rb}
            colliders="hull"
            scale={5}
            gravityScale={0}
            enabledRotations={[true, true, true]}
            enabledTranslations={[true, true, true]}
            type="kinematicVelocity"
        >
            <group ref={cameraRig}>
                <group ref={spaceshipGroup}>
                    <group rotation={[0, Math.PI / 2, 0]}>
                        <primitive object={spaceshipScene.clone()} scale={2} />
                    </group>
                </group>
            </group>
        </RigidBody>
    )
}