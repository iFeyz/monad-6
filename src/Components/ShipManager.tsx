import  { useRef, useEffect } from 'react';
import { useShipStore, useShipSync } from '../Stores/shipStore';
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore';
import { Vector3 } from 'three';
import { useMyId } from 'react-together';
import { useThree } from '@react-three/fiber';
import { ShipController } from './SpaceShipController';
import ShipOther from './SpaceShipOther';
import { SpaceshipSpawner } from './SpawnShipSpawner';
import { SpaceshipInteractions } from './SpaceShipInteraction';

export default function ShipManager() {
    const currentUserId = useMyId();
    const { ships, leaveShip } = useShipSync();
    const getPlayer = usePlayerStore(state => state.getPlayer);
    const getControlledShip = useShipStore(state => state.getControlledShip);
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera);
    const spawnPlayer = usePlayerStore(state => state.spawnPlayer);
    const { updateSpawned, updatePosition } = usePlayerStateSyncManager(currentUserId || '');
    const { camera } = useThree();

    const playerRef = useRef<any>(null);
    
    // Variables to manage exit state
    const isExitingShip = useRef(false);
    const cameraTransitionTarget = useRef<Vector3 | null>(null);
    const transitionProgress = useRef(0);

    // CORRECTION: X key handling with smooth transition
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'x' && !isExitingShip.current) {
                const controlledShip = getControlledShip(currentUserId || '');
                
                if (controlledShip && currentUserId) {
                    console.log(`Exiting ship ${controlledShip.id} with smooth transition`);
                    isExitingShip.current = true;
                    
                    // Exit position: Y+3 above the ship
                    const exitPosition = new Vector3(
                        controlledShip.position.x,
                        controlledShip.position.y + 3,
                        controlledShip.position.z
                    );
                    
                    // Final camera position for orbit camera
                    const finalCameraPosition = new Vector3(
                        exitPosition.x,
                        exitPosition.y + 4,
                        exitPosition.z - 8
                    );
                    
                    // 1. Disable pointer lock if active
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    
                    // 2. Prepare camera transition
                    cameraTransitionTarget.current = finalCameraPosition;
                    transitionProgress.current = 0;
                    
                    // 3. Exit ship IMMEDIATELY
                    leaveShip(controlledShip.id);
                    
                    // 4. Immediate actions without delay
                    updatePosition(exitPosition, 0);
                    updateSpawned(true);
                    
                    // 5. Activate player camera AFTER minimal delay
                    setTimeout(() => {
                        setPlayerCamera(currentUserId, true);
                        spawnPlayer(currentUserId, exitPosition);
                        
                        // Reset exit state after transition
                        setTimeout(() => {
                            isExitingShip.current = false;
                            cameraTransitionTarget.current = null;
                            console.log(`Exit transition completed`);
                        }, 500);
                        
                    }, 50); // Minimal delay to avoid conflicts
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentUserId, getControlledShip, leaveShip, updateSpawned, setPlayerCamera, spawnPlayer, updatePosition]);

    // Smooth camera transition handling
    useEffect(() => {
        let animationFrame: number;

        const smoothCameraTransition = () => {
            if (cameraTransitionTarget.current && transitionProgress.current < 1) {
                const startPosition = camera.position.clone();
                const targetPosition = cameraTransitionTarget.current;
                
                // Increase transition progress
                transitionProgress.current += 0.02; // Transition speed
                const progress = Math.min(transitionProgress.current, 1);
                
                // Smooth interpolation (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Apply interpolation
                camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
                
                // Look towards exit position
                const player = getPlayer(currentUserId || '');
                if (player && player.position) {
                    const lookTarget = new Vector3(
                        player.position.x,
                        player.position.y + 1.5,
                        player.position.z
                    );
                    camera.lookAt(lookTarget);
                }
                
                camera.updateMatrixWorld();
                
                // Continue animation if not finished
                if (progress < 1) {
                    animationFrame = requestAnimationFrame(smoothCameraTransition);
                }
            }
        };

        // Start transition if needed
        if (cameraTransitionTarget.current) {
            smoothCameraTransition();
        }

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [camera, currentUserId, getPlayer]);

    useEffect(() => {
        const player = getPlayer(currentUserId || '');
        if (player && player.meshRef && player.meshRef.current) {
            playerRef.current = player.meshRef.current;
        }
    }, [getPlayer, currentUserId]);



    return (
        <>
            <SpaceshipSpawner />
            <SpaceshipInteractions />
            
            {ships.map(ship => {
                if (ship.isControlled === currentUserId) {
                    return (
                        <ShipController
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