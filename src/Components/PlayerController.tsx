import { RigidBody } from "@react-three/rapier"
import { Player } from "./Player"
import { useRef } from "react"
import { MathUtils, Vector3 } from "three"
import { useFrame } from "@react-three/fiber"
import { usePlayer } from "@/Hooks/usePlayer"
import { useControls } from "leva"
import { useKeyboardControls } from "@react-three/drei"
import { usePlayerStore } from '../Stores/playerStore'
import { useStateTogether } from "react-together"


export const PlayerController = ({userId, nickname}: {userId: string, nickname: string}) => {
    const [playerPosition, setPlayerPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
    const [playerRotation, setPlayerRotation] = useStateTogether(`player_rotation_${userId}`, 0)
    const { WALK_SPEED, ROTATION_SPEED} = useControls("Character Control", {
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
    const rb = useRef<any>(null);
    const container  = useRef<any>(null);
    const rotationTarget = useRef(0);
    const cameraTarget = useRef<any>(null);
    const cameraPosition = useRef<any>(null);
    const character = useRef<any>(null);
    const cameraWorldPosition = useRef(new Vector3());
    const cameraLookAtWorldPosition = useRef(new Vector3());
    const cameraLookAt = useRef(new Vector3());
    const playerRotationTarget = useRef(0)
    const isPlayerController = usePlayerStore(state => state.isPlayerController)


    const [, get] = useKeyboardControls();

    const normalizeAngle = (angle: number) => {
        while (angle > Math.PI) {
            angle -= Math.PI * 2;
        }
        while (angle < -Math.PI) {
            angle += Math.PI * 2;
        }
        return angle;
    }

    const lerpAngle = (a: number, b: number, t: number) => {
        a = normalizeAngle(a);
        b = normalizeAngle(b);
        if (Math.abs(b - a) > Math.PI) {
            if (b > a) {
                a += Math.PI * 2;
            } else {
                b += Math.PI * 2;
            }
        }
        return normalizeAngle(a + (b - a) * t);
    }
    
    useFrame(({camera})=>{
  
        if ( !isPlayerController ) {
            return;
        }
     

        if (rb.current) {
            const vel = new Vector3(0, 0, 0);
            const movement = {
                x : 0,
                z : 0,
            };

            if (get().forward) {
                movement.z = 1;
            }
            if (get().backward) {
                movement.z = -1;
            }
            
            let speed = WALK_SPEED;

            if (get().left) {
                movement.x = 1;
            }
            if (get().right) {
                movement.x = -1;
            }

            if (movement.x !== 0) {
                rotationTarget.current += movement.x * ROTATION_SPEED;
            }

            if (movement.x !== 0 || movement.z !== 0) {
                playerRotationTarget.current = Math.atan2(movement.x, movement.z);
                vel.x = Math.sin(rotationTarget.current + playerRotationTarget.current) * speed;
                vel.z = Math.cos(rotationTarget.current + playerRotationTarget.current) * speed;
            }
            character.current.rotation.y = lerpAngle(character.current.rotation.y, playerRotationTarget.current, 0.1);
          
            rb.current.setLinvel(vel, true);
            
            
        }

        container.current.rotation.y = MathUtils.lerp(container.current.rotation.y, rotationTarget.current, 0.1);
        cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
        camera.position.lerp(cameraWorldPosition.current, 0.1);

        if ( cameraTarget.current ) {
            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
            cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1);
            camera.lookAt(cameraLookAt.current);
        }

        // set the player position
        const playerWorldPosition = rb.current.translation();
        if (playerWorldPosition.x != playerPosition[0] || playerWorldPosition.y != playerPosition[1] || playerWorldPosition.z != playerPosition[2]) {
            console.log(playerWorldPosition);
            console.log(playerPosition);
            console.log(playerWorldPosition.x != playerPosition[0]);
            console.log(playerWorldPosition.y != playerPosition[1]);
            console.log(playerWorldPosition.z != playerPosition[2]);
            setPlayerPosition([playerWorldPosition.x, playerWorldPosition.y, playerWorldPosition.z]);
            setPlayerRotation(character.current.rotation.y);
        }
    })

    return (
        <RigidBody colliders={false} lockRotations ref={rb}>
            <group ref={container}>
                <group ref={cameraTarget} position-z={1}/>
                <group ref={cameraPosition} position-y={4} position-z={-4}/>
                <group ref={character}>
                <Player position={[0, 0, 0]} rotation={character?.current?.rotation.y} nickname={nickname} isCurrentUser={true} color="red"/>
                </group>
            </group>
        </RigidBody>
    )
}