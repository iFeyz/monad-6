import { create } from "zustand"
import * as THREE from "three"
import React from "react"
import { useStateTogether } from "react-together"
import { usePlayerStore } from "./playersStore"

type SyncShip = {
    id: string;
    position: [number, number, number]; // Serializable format
    rotation: [number, number, number]; // Serializable format (Euler angles)
    isControlled: string | null; 
}

type LocalShip = {
    id: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    isControlled: string | null; 
}

type ShipStoreState = {
    ships: LocalShip[];

    syncShips: (syncedShips: SyncShip[]) => void;

    addShip: (ship: LocalShip) => void;
    removeShip: (id: string) => void;
    updateShipPosition: (id: string, position: THREE.Vector3) => void;
    updateShipRotation: (id: string, rotation: THREE.Euler) => void;
    setShipControlledBy: (shipId: string, userId: string | null) => void;
    getShip: (id: string) => LocalShip | undefined;
    getControlledShip: (userId: string) => LocalShip | undefined;
    cleanupDisconnectedPlayerShips: (connectedPlayerIds: string[]) => void;
}

export const useShipStore = create<ShipStoreState>((set, get) => ({
    ships: [],

    syncShips: (syncedShips: SyncShip[]) => {
        set((state) => {
            const currentShipsMap = new Map(state.ships.map(s => [s.id, s]));
            const newShips: LocalShip[] = [];

            syncedShips.forEach(syncedShip => {
                const existingShip = currentShipsMap.get(syncedShip.id);
                const newPosition = new THREE.Vector3(...syncedShip.position);
                const newRotation = new THREE.Euler(...syncedShip.rotation);
                const newIsControlled = syncedShip.isControlled;

                if (existingShip) {
                    const posChanged = !existingShip.position.equals(newPosition);
                    const rotChanged = !existingShip.rotation.equals(newRotation);
                    const controlledChanged = existingShip.isControlled !== newIsControlled;

                    if (posChanged || rotChanged || controlledChanged) {
                        newShips.push({
                            ...existingShip,
                            position: posChanged ? newPosition : existingShip.position,
                            rotation: rotChanged ? newRotation : existingShip.rotation,
                            isControlled: controlledChanged ? newIsControlled : existingShip.isControlled,
                        });
                    } else {
                        newShips.push(existingShip);
                    }
                } else {
                    newShips.push({
                        id: syncedShip.id,
                        position: newPosition,
                        rotation: newRotation,
                        isControlled: newIsControlled,
                    });
                }
            });

            const finalShips = newShips.filter(ship => syncedShips.some(s => s.id === ship.id));

            const hasStructuralChanges =
                state.ships.length !== finalShips.length ||
                !state.ships.every(localShip => {
                    const foundSynced = finalShips.find(s => s.id === localShip.id);
                    return foundSynced &&
                           foundSynced.position.equals(localShip.position) &&
                           foundSynced.rotation.equals(localShip.rotation) &&
                           foundSynced.isControlled === localShip.isControlled;
                });

            if (hasStructuralChanges) {
                return { ships: finalShips };
            }
            return state;
        });
    },

    addShip: (ship: LocalShip) => {
        set((state) => {
            const newShips = [...state.ships, ship];
            return { ships: newShips };
        });
    },

    removeShip: (id: string) => {
        set((state) => {
            const newShips = state.ships.filter((ship) => ship.id !== id);
            return { ships: newShips };
        });
    },

    updateShipPosition: (id: string, position: THREE.Vector3) => {
        set((state) => ({
            ships: state.ships.map((ship) => ship.id === id ? { ...ship, position } : ship)
        }));
    },

    updateShipRotation: (id: string, rotation: THREE.Euler) => {
        set((state) => ({
            ships: state.ships.map((ship) => ship.id === id ? { ...ship, rotation } : ship)
        }));
    },

    setShipControlledBy: (shipId: string, userId: string | null) => {
        set((state) => ({
            ships: state.ships.map((ship) =>
                ship.id === shipId ? { ...ship, isControlled: userId } : ship
            )
        }));
    },

    cleanupDisconnectedPlayerShips: (connectedPlayerIds: string[]) => {
        set((state) => {
            const shipsToRemove = state.ships.filter(ship => 
                ship.isControlled && !connectedPlayerIds.includes(ship.isControlled)
            );

            if (shipsToRemove.length > 0) {                
                const remainingShips = state.ships.filter(ship => 
                    !ship.isControlled || connectedPlayerIds.includes(ship.isControlled)
                );
                
                return { ships: remainingShips };
            }
            
            return state;
        });
    },

    getShip: (id: string) => get().ships.find(ship => ship.id === id),
    getControlledShip: (userId: string) => get().ships.find(ship => ship.isControlled === userId)
}));


export const useShipSync = () => {

    const players = usePlayerStore((state) => state.players);
    const localShips = useShipStore((state) => state.ships);
    const getShip = useShipStore((state) => state.getShip);
    const syncShips = useShipStore((state) => state.syncShips);
    const addShip = useShipStore((state) => state.addShip);
    const removeShip = useShipStore((state) => state.removeShip);
    const updateShipPosition = useShipStore((state) => state.updateShipPosition);
    const updateShipRotation = useShipStore((state) => state.updateShipRotation);
    const setShipControlledBy = useShipStore((state) => state.setShipControlledBy);
    const cleanupDisconnectedPlayerShips = useShipStore((state) => state.cleanupDisconnectedPlayerShips);

    const [reactTogetherShips, setReactTogetherShips] = useStateTogether<SyncShip[]>(`ships`, []);

    const isUpdatingFromReactTogetherRef = React.useRef(false);

    React.useEffect(() => {
        const connectedPlayerIds = players.map(player => player.userId);
        cleanupDisconnectedPlayerShips(connectedPlayerIds);
    }, [players, cleanupDisconnectedPlayerShips]);

    React.useEffect(() => {
        if (isUpdatingFromReactTogetherRef.current) {
            isUpdatingFromReactTogetherRef.current = false;
            return;
        }

        const serializedShips: SyncShip[] = localShips.map(ship => ({
            id: ship.id,
            position: [ship.position.x, ship.position.y, ship.position.z],
            rotation: [ship.rotation.x, ship.rotation.y, ship.rotation.z],
            isControlled: ship.isControlled,
        }));

        const currentReactTogetherShipsString = JSON.stringify(reactTogetherShips);
        const newSerializedShipsString = JSON.stringify(serializedShips);

        if (currentReactTogetherShipsString !== newSerializedShipsString) {
            setReactTogetherShips(serializedShips);
        }
    }, [localShips, setReactTogetherShips]);

    React.useEffect(() => {
        isUpdatingFromReactTogetherRef.current = true;
        syncShips(reactTogetherShips);
    }, [reactTogetherShips, syncShips]);


    const createShip = React.useCallback((id: string, pos: THREE.Vector3, rot: THREE.Euler) => {
        addShip({ id, position: pos, rotation: rot, isControlled: null });
    }, [addShip]);

    const deleteShip = React.useCallback((id: string) => {
        removeShip(id);
    }, [removeShip]);

    const updateShipPos = React.useCallback((id: string, position: THREE.Vector3) => {
        updateShipPosition(id, position);
    }, [updateShipPosition]);

    const updateShipRot = React.useCallback((id: string, rotation: THREE.Euler) => {
        updateShipRotation(id, rotation);
    }, [updateShipRotation]);

    const controlShip = React.useCallback((shipId: string, userId: string) => {
        setShipControlledBy(shipId, userId);
    }, [setShipControlledBy]);

    const leaveShip = React.useCallback((shipId: string) => {
        setShipControlledBy(shipId, null);
        
        const updatedShips = localShips.map(ship => 
            ship.id === shipId 
                ? { ...ship, isControlled: null }
                : ship
        );
        
        const serializedShips: SyncShip[] = updatedShips.map(ship => ({
            id: ship.id,
            position: [ship.position.x, ship.position.y, ship.position.z],
            rotation: [ship.rotation.x, ship.rotation.y, ship.rotation.z],
            isControlled: ship.isControlled,
        }));
        
        setReactTogetherShips(serializedShips);
        
    }, [setShipControlledBy, localShips, setReactTogetherShips, getShip]);


    return {
        ships: localShips,
        addShip: createShip,
        removeShip: deleteShip,
        updateShipPosition: updateShipPos,
        updateShipRotation: updateShipRot,
        controlShip,
        leaveShip,
        reactTogetherShips,
    };
};