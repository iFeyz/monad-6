import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useShipStore, useShipSync } from '../Stores/shipStore';
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { RapierRigidBody } from '@react-three/rapier';
import { RigidBody } from '@react-three/rapier';
import { useMyId } from 'react-together';
import ShipControlled from './SpaceShipController';
import ShipOther from './SpaceShipOther';

// Define a reasonable interaction distance
const INTERACTION_DISTANCE = 5; // Units

export default function ShipManager() {
    const currentUserId = useMyId();

    const { ships, controlShip, leaveShip } = useShipSync();
    const getPlayer = usePlayerStore(state => state.getPlayer);
    const getControlledShip = useShipStore(state => state.getControlledShip);
    const { updateSpawned } = usePlayerStateSyncManager(currentUserId || 'local');

    const playerRef = useRef<any>(null);
    const [_, getKeys] = useKeyboardControls();

    // Effect to get the local player's mesh reference
    useEffect(() => {
        const player = getPlayer(currentUserId || '');
        if (player && player.meshRef && player.meshRef.current) {
            playerRef.current = player.meshRef.current;
        }
    }, [getPlayer, currentUserId]);

    return (
        <>
            {ships.map(ship => {
                if (ship.isControlled === currentUserId) {
                    return (
                        // Pass initialPosition and initialRotation here.
                        // ShipControlled will use these for the RigidBody's initial state.
                        <ShipControlled
                            key={ship.id}
                            shipId={ship.id}
                            initialPosition={ship.position}
                            initialRotation={ship.rotation}
                        />
                    );
                } else {
                    return (
                        <ShipOther
                            key={ship.id}
                            shipId={ship.id}
                            position={ship.position}
                            rotation={ship.rotation}
                        />
                    );
                }
            })}
        </>
    );
}