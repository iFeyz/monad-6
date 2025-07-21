import React, { useRef, useEffect } from 'react';
import { useShipStore, useShipSync } from '../Stores/shipStore';
import { usePlayerStore, usePlayerStateSyncManager } from '../Stores/playersStore';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { useMyId } from 'react-together';
import ShipControlled from './SpaceShipController';
import ShipOther from './SpaceShipOther';
import { SpaceshipSpawner } from './SpawnShipSpawner';
import { SpaceshipInteractions } from './SpaceShipInteraction';

// Hook pour gérer la sortie du vaisseau
const useShipExitManager = () => {
    const { leaveShip } = useShipSync()
    const myId = useMyId()
    const spawnPlayer = usePlayerStore(state => state.spawnPlayer)
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const getControlledShip = useShipStore(state => state.getControlledShip)
    // NOUVEAU: Ajout du hook de synchronisation pour mettre à jour les états
    const { updateSpawned } = usePlayerStateSyncManager(myId || '')

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'x') {
                const controlledShip = getControlledShip(myId || '')
                
                if (controlledShip && myId) {
                    console.log(`${myId} exiting ship ${controlledShip.id}`)
                    
                    // Position de sortie près du vaisseau
                    const exitPosition = new Vector3(
                        controlledShip.position.x + Math.random() * 10 - 5,
                        controlledShip.position.y + 3,
                        controlledShip.position.z + Math.random() * 10 - 5
                    )
                    
                    // 1. Quitter le vaisseau (comme dans PlayerConfig)
                    leaveShip(controlledShip.id)
                    
                    // 2. Délai pour s'assurer que leaveShip s'est exécuté
                    setTimeout(() => {
                        // 3. Respawn le joueur (comme dans PlayerConfig: updateSpawned(true))
                        updateSpawned(true)
                        
                        // 4. Réactiver la caméra du joueur (comme dans PlayerConfig)
                        setPlayerCamera(myId, true)
                        
                        // 5. Optionnel: Forcer la position de spawn
                        spawnPlayer(myId, exitPosition)
                        
                        console.log(`${myId} spawned at exit position:`, exitPosition)
                    }, 200)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [myId, leaveShip, spawnPlayer, setPlayerCamera, getControlledShip, updateSpawned])
}


export default function ShipManager() {
    const currentUserId = useMyId();
    const { ships } = useShipSync();
    const getPlayer = usePlayerStore(state => state.getPlayer);
    const getControlledShip = useShipStore(state => state.getControlledShip);

    const playerRef = useRef<any>(null);
    const [_, getKeys] = useKeyboardControls();

    // Gestionnaire de sortie du vaisseau
    useShipExitManager()

    // Effect to get the local player's mesh reference
    useEffect(() => {
        const player = getPlayer(currentUserId || '');
        if (player && player.meshRef && player.meshRef.current) {
            playerRef.current = player.meshRef.current;
        }
    }, [getPlayer, currentUserId]);

    const controlledShip = getControlledShip(currentUserId || '')

    return (
        <>
            {/* Spawner de vaisseaux */}
            <SpaceshipSpawner />
            
            {/* Interactions pour entrer dans les vaisseaux */}
            <SpaceshipInteractions />
          
            {/* Rendu des vaisseaux */}
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
