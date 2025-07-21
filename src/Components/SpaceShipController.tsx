// ShipControlled.tsx
import { RigidBody } from "@react-three/rapier"
import { useRef, useEffect } from "react"
import { Vector3, Quaternion, Matrix4, Euler } from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls, useGLTF, PerspectiveCamera } from "@react-three/drei"
import { useControls } from "leva"
import * as THREE from 'three'
import manta from "/manta.glb?url"
import { useShipStore } from '@/Stores/shipStore'; 
import { RapierRigidBody } from '@react-three/rapier';

type ShipControlledProps = {
    shipId: string;
    initialPosition: Vector3;
    initialRotation: Euler;
}

export default function ShipControlled({ shipId }: ShipControlledProps) {
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
    } = useControls("ShipControlled", {
        THRUST_POWER: { value: 75 },
        MOUSE_SENSITIVITY: { value: 1 },
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

    const ship = useShipStore(state => state.getShip(shipId));

    const rb = useRef<RapierRigidBody>(null); // Use RapierRigidBody type
    const spaceshipGroup = useRef<any>(null);
    const cameraRig = useRef<any>(null);

    const mousePosition = useRef({ x: 0, y: 0 })
    const targetDirection = useRef(new Vector3(0, 0, -1))
    const currentRotation = useRef(new Quaternion())

    const thrust = useRef(new Vector3())
    const [, get] = useKeyboardControls()

    const { scene: spaceshipScene } = useGLTF(manta)
    const { size, camera } = useThree()
    

    const updateShipPosition = useShipStore(state => state.updateShipPosition);
    const updateShipRotation = useShipStore(state => state.updateShipRotation);

    const shaderRef = useRef<any>(null); 
    const viewRotation = useRef(new Euler(0, 0, 0, 'YXZ'))




    useEffect(() => {

        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 80;
            camera.near = 0.1;
            camera.far = 5000;
            camera.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
            console.log(`Camera FOV: ${camera.fov}, Near: ${camera.near}, Far: ${camera.far}`);
        }

        const handleMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement !== document.querySelector('canvas')) return;
          
            const deltaX = event.movementX || 0;
            const deltaY = event.movementY || 0;
          
            // Update pitch and yaw
            viewRotation.current.y -= deltaX * 0.0025 * MOUSE_SENSITIVITY; // yaw
            viewRotation.current.x -= deltaY * 0.0025 * MOUSE_SENSITIVITY; // pitch
          
            // Clamp pitch to avoid flipping (e.g., -89° to 89°)
            const maxPitch = Math.PI / 2 - 0.01;
            const minPitch = -Math.PI / 2 + 0.01;
            viewRotation.current.x = Math.max(minPitch, Math.min(maxPitch, viewRotation.current.x));
          
            // Recalculate target direction from rotation
            targetDirection.current.set(0, 0, -1).applyEuler(viewRotation.current);
          }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [MOUSE_SENSITIVITY, size.width, size.height])

    useFrame(({ clock }) => {
        if (!rb.current) return

    


        if (shaderRef.current) {
            shaderRef.current.uniforms.time.value = clock.getElapsedTime()
        }

        const controls = get()
        thrust.current.set(0, 0, 0)

        const shipPos = rb.current.translation()
        const shipPosition = new Vector3(shipPos.x, shipPos.y, shipPos.z)

        

        // Rotation
        const target = targetDirection.current.clone()
        const up = new Vector3(0, 1, 0)
        const targetPos = shipPosition.clone().add(target)

        const lookMatrix = new Matrix4().lookAt(shipPosition, targetPos, up)
        const desiredQuat = new Quaternion().setFromRotationMatrix(lookMatrix)

        // Add roll
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

        // Movement
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

        // Update ship position and rotation in the store
        // Only update if there's a significant change to prevent too many syncs
        const currentRbRotation = new Euler().setFromQuaternion(currentRotation.current);
        if (ship && ship.position.distanceTo(shipPosition) > 0.3) {
            updateShipPosition(shipId, shipPosition);
            updateShipRotation(shipId, currentRbRotation);
        }

        // Camera
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
            gravityScale={0.1}
            enabledRotations={[true, true, true]}
            enabledTranslations={[true, true, true]}
            type="dynamic"
            // Set initial position and rotation explicitly for RigidBody
         
        >
            <group ref={cameraRig}>
        
                <group ref={spaceshipGroup}>
                    <group rotation={[0, Math.PI / 2, 0]}>
                        <primitive object={spaceshipScene.clone()} scale={2} />
                    </group>
                </group>
                <group>
                    {/* Flame effect - same as before */}
                    <mesh position={[0, 0.1, 1.2]} rotation={[-Math.PI, Math.PI, 0]}>
                        <boxGeometry args={[0.2, 0.2, 2.5]} />
                        <shaderMaterial
                            ref={shaderRef}
                            attach="material"
                            args={[{
                                uniforms: {
                                    time: { value: 0 },
                                    boxSize: { value: new Vector3(0.2, 0.2, 2.5) }
                                },
                                vertexShader: `
                                    varying vec3 vLocalPosition;
                                    void main() {
                                        vLocalPosition = position;
                                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                    }
                                `,
                                fragmentShader: `
                                    uniform float time;
                                    uniform vec3 boxSize;
                                    varying vec3 vLocalPosition;

                                    float hash(float n) { return fract(sin(n) * 43758.5453123); }

                                    float noise(vec3 x) {
                                        vec3 p = floor(x);
                                        vec3 f = fract(x);
                                        f = f * f * (3.0 - 2.0 * f);
                                        float n = p.x + p.y * 157.0 + p.z * 113.0;
                                        return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                                                       mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
                                                   mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                                                       mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
                                    }

                                    void main() {
                                        vec3 localPos = vLocalPosition;
                                        
                                        float flameZ = (localPos.z + boxSize.z * 0.5);
                                        float normalizedFlameZ = flameZ / boxSize.z;
                                        
                                        float distFromCenter = length(localPos.xy);
                                        float maxRadialDist = max(boxSize.x, boxSize.y) * 0.5;
                                        float normalizedRadialDist = distFromCenter / maxRadialDist;

                                        vec3 color1 = vec3(1.0, 1.0, 0.8);
                                        vec3 color2 = vec3(1.0, 0.6, 0.0);
                                        vec3 color3 = vec3(0.9, 0.2, 0.0);
                                        vec3 color4 = vec3(0.5, 0.05, 0.0);

                                        vec3 flameColor = mix(color1, color2, normalizedFlameZ * 2.0);
                                        flameColor = mix(flameColor, color3, max(0.0, (normalizedFlameZ - 0.3)) * 2.0);
                                        flameColor = mix(flameColor, color4, max(0.0, (normalizedFlameZ - 0.7)) * 3.0);

                                        float intensityZ = pow(1.0 - normalizedFlameZ, 5.0);
                                        float intensityRadial = pow(1.0 - normalizedRadialDist, 8.0);

                                        float baseIntensity = intensityZ * intensityRadial;

                                        float noiseSpeed = time * 12.0;
                                        float noiseScale = 8.0;
                                        float noiseVal = noise(vec3(localPos.x * noiseScale, localPos.y * noiseScale, localPos.z * noiseScale + noiseSpeed));
                                        
                                        float flicker = (noiseVal - 0.5) * 0.6;
                                        float distortion = noise(vec3(localPos.x * 10.0, localPos.y * 10.0, localPos.z * 10.0 + time * 5.0)) * 0.3;

                                        float finalIntensity = baseIntensity + flicker + distortion;
                                        finalIntensity = clamp(finalIntensity, 0.0, 1.0);

                                        finalIntensity = smoothstep(0.4, 1.0, finalIntensity); 

                                        gl_FragColor = vec4(flameColor * finalIntensity * 3.0, finalIntensity * 2.5);
                                    }
                                `,
                                transparent: true,
                                blending: THREE.AdditiveBlending,
                                depthWrite: false,
                            }]} />
                    </mesh>
                </group>
            </group>
        </RigidBody>
    )
}