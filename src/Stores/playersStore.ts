import { create } from 'zustand'
import * as THREE from 'three'
import React from 'react'
import { useConnectedUsers, useNicknames, useStateTogether } from "react-together"

// Player data type (without methods)
type Player = {
    isSpawned: boolean
    isDespawned: boolean
    isPlayerController: boolean
    nickname: string
    userId: string
    position: THREE.Vector3
    rotation: THREE.Euler
    meshRef: React.RefObject<THREE.Mesh> | null
}

// Store state type (with methods)
type PlayerStoreState = {
    players: Player[]
    
    // Player management - synchronization with react-together
    syncWithConnectedUsers: (connectedUsers: string[], nicknames: Record<string, string>) => void
    
    // Individual player actions
    spawnPlayer: (userId: string, pos?: THREE.Vector3) => void
    despawnPlayer: (userId: string) => void
    setPlayerPosition: (userId: string, pos: THREE.Vector3) => void
    setPlayerRotation: (userId: string, rot: THREE.Euler) => void
    setPlayerMeshRef: (userId: string, ref: React.RefObject<THREE.Mesh>) => void
    setPlayerController: (userId: string, isController: boolean) => void
    
    // Getters
    getPlayer: (userId: string) => Player | undefined
    getControllerPlayer: () => Player | undefined
    getAllSpawnedPlayers: () => Player[]
    
    // Utility methods
    clearAllPlayers: () => void
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
    players: [],
    
    // Sync players with react-together connected users
    syncWithConnectedUsers: (connectedUsers: string[], nicknames: Record<string, string>) => {
        set((state) => {
            // Éviter les mises à jour inutiles si aucun changement
            if (state.players.length === connectedUsers.length) {
                const hasChanges = connectedUsers.some(userId => {
                    const existingPlayer = state.players.find(p => p.userId === userId)
                    return !existingPlayer || existingPlayer.nickname !== (nicknames[userId] || '')
                })
                
                if (!hasChanges) {
                    return state // Pas de changement, retourner l'état actuel
                }
            }
            
            // Get current players map for easier lookup
            const currentPlayers = new Map(state.players.map(p => [p.userId, p]))
            
            // Create new players array based on connected users
            const newPlayers: Player[] = connectedUsers.map(userId => {
                const existingPlayer = currentPlayers.get(userId)
                
                if (existingPlayer) {
                    // Update nickname if it changed
                    const newNickname = nicknames[userId] || existingPlayer.nickname
                    if (newNickname === existingPlayer.nickname) {
                        return existingPlayer // Pas de changement, retourner l'objet existant
                    }
                    return {
                        ...existingPlayer,
                        nickname: newNickname
                    }
                } else {
                    // Create new player for newly connected user
                    return {
                        isSpawned: false,
                        isPlayerController: false,
                        nickname: nicknames[userId] || '',
                        userId,
                        position: new THREE.Vector3(),
                        rotation: new THREE.Euler(),
                        meshRef: null
                    }
                }
            })
            
            return { players: newPlayers }
        })
    },
    
    // Individual player actions
    spawnPlayer: (userId: string, pos?: THREE.Vector3) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { 
                        ...player, 
                        isSpawned: true,
                        position: pos ? pos.clone() : player.position,
                        isDespawned: false
                    }
                    : player
            )
        })),
    
    despawnPlayer: (userId: string) =>
       
        set((state) => ({
            
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { ...player, isSpawned: true, isDespawned: true }
                    : player
            )
        })),
  
    
    setPlayerPosition: (userId: string, pos: THREE.Vector3) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { ...player, position: pos.clone() }
                    : player
            )
        })),
    
    setPlayerRotation: (userId: string, rot: THREE.Euler) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { ...player, rotation: rot.clone() }
                    : player
            )
        })),
    
    setPlayerMeshRef: (userId: string, ref: React.RefObject<THREE.Mesh>) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { ...player, meshRef: ref }
                    : player
            )
        })),
    
    setPlayerController: (userId: string, isController: boolean) =>
        set((state) => ({
            players: state.players.map((player) => ({
                ...player,
                isPlayerController: player.userId === userId ? isController : false
            }))
        })),
    
    // Getters
    getPlayer: (userId: string) =>
        get().players.find((player) => player.userId === userId),
    
    getControllerPlayer: () =>
        get().players.find((player) => player.isPlayerController),
    
    getAllSpawnedPlayers: () =>
        get().players.filter((player) => player.isSpawned),
    
    // Utility methods
    clearAllPlayers: () =>
        set({ players: [] })
}))

// Hook personnalisé pour synchroniser automatiquement les players avec react-together
export const usePlayerSync = () => {
    const connectedUsers = useConnectedUsers()
    const nicknames = useNicknames()
    const syncWithConnectedUsers = usePlayerStore(state => state.syncWithConnectedUsers)
    
    // Utiliser des refs pour éviter les re-renders inutiles
    const connectedUsersRef = React.useRef<string[]>([])
    const nicknamesRef = React.useRef<Record<string, string>>({})
    
    React.useEffect(() => {
        // Vérifier si les utilisateurs connectés ont vraiment changé
        const usersChanged = JSON.stringify(connectedUsersRef.current) !== JSON.stringify(connectedUsers)
        const nicknamesChanged = JSON.stringify(nicknamesRef.current) !== JSON.stringify(nicknames)
        
        if (usersChanged || nicknamesChanged) {
            connectedUsersRef.current = connectedUsers.map(user => user.userId)
            nicknamesRef.current = nicknames[0] // Fix: il faut accéder au bon format de nicknames
            syncWithConnectedUsers(connectedUsersRef.current, nicknamesRef.current)
        }
    }, [connectedUsers, nicknames, syncWithConnectedUsers])
}

// Hook pour synchroniser les positions des joueurs avec react-together
export const usePlayerPositionSync = (userId: string) => {
    const [playerPosition, setPlayerPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
    const [playerRotation, setPlayerRotation] = useStateTogether(`player_rotation_${userId}`, 0)
    
    const setStorePlayerPosition = usePlayerStore(state => state.setPlayerPosition)
    const setStorePlayerRotation = usePlayerStore(state => state.setPlayerRotation)
    const getPlayer = usePlayerStore(state => state.getPlayer)
    
    // Synchroniser depuis react-together vers le store Zustand
    React.useEffect(() => {
        if (playerPosition && playerPosition.length === 3) {
            const pos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
            setStorePlayerPosition(userId, pos)
        }
    }, [playerPosition, userId, setStorePlayerPosition])
    
    React.useEffect(() => {
        if (typeof playerRotation === 'number') {
            const rot = new THREE.Euler(0, playerRotation, 0)
            setStorePlayerRotation(userId, rot)
        }
    }, [playerRotation, userId, setStorePlayerRotation])
    
    // Fonction pour mettre à jour la position depuis le contrôleur
    const updatePosition = React.useCallback((position: THREE.Vector3, rotation: number) => {
        const currentPos = playerPosition
        const currentRot = playerRotation
        
        // Éviter les mises à jour inutiles
        if (
            !currentPos ||
            Math.abs(currentPos[0] - position.x) > 0.01 ||
            Math.abs(currentPos[1] - position.y) > 0.01 ||
            Math.abs(currentPos[2] - position.z) > 0.01 ||
            Math.abs(currentRot - rotation) > 0.01
        ) {
            setPlayerPosition([position.x, position.y, position.z])
            setPlayerRotation(rotation)
        }
    }, [playerPosition, playerRotation, setPlayerPosition, setPlayerRotation])
    
    return {
        playerPosition,
        playerRotation,
        updatePosition
    }
}

// Ajoute dans playersStore.ts

export const usePlayerSyncState = (userId: string) => {
    const [isDespawned, setIsDespawned] = useStateTogether(`player_despawn_${userId}`, false)
    const { playerPosition, playerRotation, updatePosition } = usePlayerPositionSync(userId)

    const getPlayer = usePlayerStore(state => state.getPlayer)
    const despawnPlayer = usePlayerStore(state => state.despawnPlayer)
    const spawnPlayer = usePlayerStore(state => state.spawnPlayer)

    React.useEffect(() => {
        const player = getPlayer(userId)
        if (!player) return

        // Sync de react-together vers Zustand
        if (isDespawned && !player.isDespawned) {
            despawnPlayer(userId)
        } else if (!isDespawned && player.isDespawned) {
            spawnPlayer(userId)
        }
    }, [isDespawned, userId, despawnPlayer, spawnPlayer, getPlayer])

    // Méthode à exposer
    const updateDespawn = React.useCallback((despawn: boolean) => {
        setIsDespawned(despawn)
    }, [setIsDespawned])

    return {
        playerPosition,
        playerRotation,
        updatePosition,
        isDespawned,
        updateDespawn,
    }
}


// Hook pour récupérer les positions synchronisées de tous les joueurs
export const useAllPlayersPositions = () => {
    const players = usePlayerStore(state => state.players)
    
    return players.map(player => ({
        userId: player.userId,
        nickname: player.nickname,
        position: player.position,
        rotation: player.rotation,
        isSpawned: player.isSpawned,
        isController: player.isPlayerController
    }))
}