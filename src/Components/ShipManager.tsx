import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useShipStore, useShipSync } from './playerStore'; // Assuming playerStore.ts is where ship store is
import { usePlayerStore, usePlayerStateSyncManager } from './playerStore'; // Also need player store
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Quaternion } from 'three';
import { RapierRigidBody } from '@react-three/rapier'; // Import RapierRigidBody type
import { RigidBody } from '@react-three/rapier';
import ShipControlled from './ShipControlled'; // This will be your existing SpaceShipController
import ShipOther from './ShipOther'; // New component for other ships

// Define a reasonable interaction distance
const INTERACTION_DISTANCE = 5; // Units

export default function ShipManager() {
    const { getCurrentUserId } = useThree(); // Get current user ID
    const currentUserId = getCurrentUserId();

    const { ships, controlShip, leaveShip } = useShipSync(); // Ship sync actions
    const getPlayer = usePlayerStore(state => state.getPlayer);
    const getControlledShip = useShipStore(state => state.getControlledShip);
    const { updateSpawned } = usePlayerStateSyncManager(currentUserId || 'local'); // Assuming player manager for local user

    const playerRef = useRef<THREE.Mesh>(null); // Ref to the local player's mesh
    const [_, getKeys] = useKeyboardControls();

    // Effect to get the local player's mesh reference
    useEffect(() => {
        const player = getPlayer(currentUserId || '');
        if (player && player.meshRef && player.meshRef.current) {
            playerRef.current = player.meshRef.current;
        }
    }, [getPlayer, currentUserId]);

    // Interaction logic for pressing 'E'
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'e' || event.key === 'E') {
                const controlledShip = getControlledShip(currentUserId || '');

                if (controlledShip) {
                    // Current user is already controlling a ship, so they want to leave it
                    leaveShip(controlledShip.id);
                    // Respawn player
                    updateSpawned(true);
                } else {
                    // User is not controlling a ship, check for nearby ships to enter
                    if (!playerRef.current) return;

                    const playerPosition = playerRef.current.position;

                    // Find the closest uncontrolled ship
                    let closestShip: { ship: LocalShip, distance: number } | null = null;
                    ships.forEach(ship => {
                        if (ship.isControlled === null) { // Only consider uncontrolled ships
                            const shipPosition = ship.position;
                            const distance = playerPosition.distanceTo(shipPosition);

                            if (distance < INTERACTION_DISTANCE) {
                                if (!closestShip || distance < closestShip.distance) {
                                    closestShip = { ship: ship, distance: distance };
                                }
                            }
                        }
                    });

                    if (closestShip) {
                        controlShip(closestShip.ship.id, currentUserId || '');
                        // Despawn player
                        updateSpawned(false);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ships, currentUserId, getControlledShip, controlShip, leaveShip, playerRef, updateSpawned]);


    // Render ships
    return (
        <>
            {ships.map(ship => {
                const isLocalControlled = ship.isControlled === currentUserId;
                const isOtherControlled = ship.isControlled !== null && ship.isControlled !== currentUserId;

                if (isLocalControlled) {
                    // Render the full ShipControlled component for the local player
                    return (
                        <ShipControlled
                            key={ship.id}
                            shipId={ship.id}
                            initialPosition={ship.position}
                            initialRotation={ship.rotation}
                        />
                    );
                } else if (isOtherControlled || ship.isControlled === null) {
                    // Render other ships (controlled by others or free) as dummies
                    return (
                        <ShipOther
                            key={ship.id}
                            shipId={ship.id}
                            position={ship.position}
                            rotation={ship.rotation}
                        />
                    );
                }
                return null;
            })}
        </>
    );
}