import React, { useRef, useEffect } from 'react';
import { useShipStore, useShipSync } from '../Stores/shipStore';
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore';
import { useKeyboardControls } from '@react-three/drei';
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
    const [_, getKeys] = useKeyboardControls();
    
    // Variables pour gérer l'état de sortie
    const isExitingShip = useRef(false);
    const cameraTransitionTarget = useRef<Vector3 | null>(null);
    const transitionProgress = useRef(0);

    // CORRECTION: Gestion de la touche X avec transition fluide
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'x' && !isExitingShip.current) {
                const controlledShip = getControlledShip(currentUserId || '');
                
                if (controlledShip && currentUserId) {
                    console.log(`Sortie du vaisseau ${controlledShip.id} avec transition fluide`);
                    isExitingShip.current = true;
                    
                    // Position de sortie: Y+3 au-dessus du vaisseau
                    const exitPosition = new Vector3(
                        controlledShip.position.x,
                        controlledShip.position.y + 3,
                        controlledShip.position.z
                    );
                    
                    // Position finale de la caméra pour l'orbit camera
                    const finalCameraPosition = new Vector3(
                        exitPosition.x,
                        exitPosition.y + 4,
                        exitPosition.z - 8
                    );
                    
                    // 1. Désactiver pointer lock si actif
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    
                    // 2. Préparer la transition de caméra
                    cameraTransitionTarget.current = finalCameraPosition;
                    transitionProgress.current = 0;
                    
                    // 3. Sortir du vaisseau IMMÉDIATEMENT
                    leaveShip(controlledShip.id);
                    
                    // 4. Actions immédiates sans délai
                    updatePosition(exitPosition, 0);
                    updateSpawned(true);
                    
                    // 5. Activer la caméra joueur APRÈS un délai minimal
                    setTimeout(() => {
                        setPlayerCamera(currentUserId, true);
                        spawnPlayer(currentUserId, exitPosition);
                        
                        // Réinitialiser l'état de sortie après la transition
                        setTimeout(() => {
                            isExitingShip.current = false;
                            cameraTransitionTarget.current = null;
                            console.log(`Transition de sortie terminée`);
                        }, 500);
                        
                    }, 50); // Délai minimal pour éviter les conflits
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentUserId, getControlledShip, leaveShip, updateSpawned, setPlayerCamera, spawnPlayer, updatePosition]);

    // Gestion de la transition fluide de caméra
    useEffect(() => {
        let animationFrame: number;

        const smoothCameraTransition = () => {
            if (cameraTransitionTarget.current && transitionProgress.current < 1) {
                const startPosition = camera.position.clone();
                const targetPosition = cameraTransitionTarget.current;
                
                // Augmenter le progrès de transition
                transitionProgress.current += 0.02; // Vitesse de transition
                const progress = Math.min(transitionProgress.current, 1);
                
                // Interpolation fluide (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Appliquer l'interpolation
                camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
                
                // Faire regarder vers la position de sortie
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
                
                // Continuer l'animation si pas terminée
                if (progress < 1) {
                    animationFrame = requestAnimationFrame(smoothCameraTransition);
                }
            }
        };

        // Démarrer la transition si nécessaire
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

    const controlledShip = getControlledShip(currentUserId || '');

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