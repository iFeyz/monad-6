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
    
    const isExitingShip = useRef(false);
    const cameraTransitionTarget = useRef<Vector3 | null>(null);
    const transitionProgress = useRef(0);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'x' && !isExitingShip.current) {
                const controlledShip = getControlledShip(currentUserId || '');
                
                if (controlledShip && currentUserId) {
                    isExitingShip.current = true;
                    
                    const exitPosition = new Vector3(
                        controlledShip.position.x,
                        controlledShip.position.y + 3,
                        controlledShip.position.z
                    );
                    
                    const finalCameraPosition = new Vector3(
                        exitPosition.x,
                        exitPosition.y + 4,
                        exitPosition.z - 8
                    );
                    
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    
                    cameraTransitionTarget.current = finalCameraPosition;
                    transitionProgress.current = 0;
                    
                    leaveShip(controlledShip.id);
                    
                    updatePosition(exitPosition, 0);
                    updateSpawned(true);
                    
                    setTimeout(() => {
                        setPlayerCamera(currentUserId, true);
                        spawnPlayer(currentUserId, exitPosition);
                        
                        setTimeout(() => {
                            isExitingShip.current = false;
                            cameraTransitionTarget.current = null;
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
                
                transitionProgress.current += 0.02; // Transition speed
                const progress = Math.min(transitionProgress.current, 1);
                
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
                
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