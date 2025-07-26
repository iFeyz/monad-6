import { RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from 'three'; // Import THREE for types
import manta from "/manta.glb?url"; // Assuming it uses the same model
import { useShipStore } from "../Stores/shipStore";
import { group } from "console";
import { Text } from "@react-three/drei";
import RocketThrust from "./RocketThrust";

type ShipOtherProps = {
    shipId: string;
    position: THREE.Vector3; // Position from synced state
    rotation: THREE.Euler;   // Rotation from synced state
};

export default function ShipOther({ shipId, position, rotation }: ShipOtherProps) {
    const { scene: spaceshipScene } = useGLTF(manta);
    const rb = useRef<any>(null); // Ref to the RigidBody
    const ship = useShipStore(state => state.getShip(shipId))
    // This effect runs whenever the 'position' or 'rotation' props change
    useEffect(() => {
        if (rb.current) {
            rb.current.setTranslation(position, true);
            // Convert Euler to Quaternion for setting RigidBody rotation
            const quaternion = new THREE.Quaternion().setFromEuler(rotation);
            rb.current.setRotation(quaternion, true);
        }
    }, [position, rotation]); // Depend on position and rotation props
    
    if (ship?.isControlled === null) {
        return (
            <RigidBody
                ref={rb}
                colliders={false}
                scale={5}
                enabledRotations={[true, true, true]}
                enabledTranslations={[true, true, true]}
                // For other players' ships, we want to control their position/rotation
                // from the synced data, so 'kinematicPosition' is appropriate.
                // This prevents physics from overriding the synced state.
                //type="kinematicPosition"
                // Optionally set initial position directly as well,
                // but the useEffect will handle updates
                position={position}
                rotation={rotation}
            >
                <group>
                    <RocketThrust />
                </group>
                <group position={[0, 0.5, 0]}>
                    <Text
                        position={[0, 0, 0]}
                        fontSize={0.3}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Not controlled
                    </Text>
                </group>
    
    
            </RigidBody>
        );
    }

    return (
        <RigidBody
            ref={rb}
            colliders={false}
            scale={5}
            gravityScale={0}
            enabledRotations={[true, true, true]}
            enabledTranslations={[true, true, true]}
            // For other players' ships, we want to control their position/rotation
            // from the synced data, so 'kinematicPosition' is appropriate.
            // This prevents physics from overriding the synced state.
            //type="kinematicPosition"
            // Optionally set initial position directly as well,
            // but the useEffect will handle updates
            position={position}
            rotation={rotation}
        >
            <group>
            <RocketThrust />           
             </group>


        </RigidBody>
    );
}