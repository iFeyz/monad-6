import React, { useRef, useEffect } from 'react';
import { useShipStore, useShipSync } from '../Stores/shipStore';
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { useMyId } from 'react-together';
import { useThree } from '@react-three/fiber';
import ShipControlled from './SpaceShipController';
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

    // CORRECTION COMPLÈTE: Gestion de la touche X avec reset caméra TOTAL
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'x' && !isExitingShip.current) {
                const controlledShip = getControlledShip(currentUserId || '');
                
                if (controlledShip && currentUserId) {
                    console.log(`Sortie du vaisseau ${controlledShip.id} avec reset caméra complet`);
                    isExitingShip.current = true;
                    
                    // Position de sortie: Y+3 au-dessus du vaisseau
                    const exitPosition = new Vector3(
                        controlledShip.position.x,
                        controlledShip.position.y + 3,
                        controlledShip.position.z
                    );
                    
                    // 1. ARRÊTER immédiatement tous les contrôles et caméra du vaisseau
                    // Désactiver pointer lock si actif
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                    }
                    
                    // 2. Reset IMMÉDIAT de la caméra à une position neutre
                    camera.position.set(
                        exitPosition.x,
                        exitPosition.y + 5,
                        exitPosition.z + 5
                    );
                    camera.lookAt(exitPosition);
                    camera.rotation.set(0, 0, 0); // Reset rotation
                    camera.updateMatrixWorld(); // Forcer la mise à jour
                    
                    // 3. Sortir du vaisseau
                    leaveShip(controlledShip.id);
                    
                    // 4. Délai court pour éviter les conflits
                    setTimeout(() => {
                        // 5. Forcer position et rotation à zéro
                        updatePosition(exitPosition, 0);
                        
                        // 6. Marquer comme spawned
                        updateSpawned(true);
                        
                        // 7. Réactiver la caméra joueur
                        setPlayerCamera(currentUserId, true);
                        
                        // 8. Spawn avec position fixe
                        spawnPlayer(currentUserId, exitPosition);
                        
                        // 9. Reset final de la caméra après un délai supplémentaire
                        setTimeout(() => {
                            camera.position.set(
                                exitPosition.x,
                                exitPosition.y + 4,
                                exitPosition.z - 4
                            );
                            camera.lookAt(exitPosition);
                            camera.rotation.set(0, 0, 0);
                            
                            isExitingShip.current = false;
                            console.log(`Reset caméra complet terminé`);
                        }, 300);
                        
                        console.log(`Joueur spawné avec caméra reset à:`, exitPosition.toArray());
                    }, 100);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentUserId, getControlledShip, leaveShip, updateSpawned, setPlayerCamera, spawnPlayer, updatePosition, camera]);

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
            
            {controlledShip && !isExitingShip.current && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '10px 15px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    zIndex: 1000,
                    border: '1px solid #444'
                }}>
                    <div>🚀 Contrôle du vaisseau</div>
                    <div>Appuyez sur X pour sortir (relâchez les autres touches)</div>
                </div>
            )}
            
            {ships.map(ship => {
                if (ship.isControlled === currentUserId) {
                    return (
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
