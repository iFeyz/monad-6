import { create } from 'zustand'
import * as THREE from 'three'
import React from 'react'
import { useConnectedUsers, useNicknames, useStateTogether } from "react-together"

// Player data type (without methods)
type Player = {
    isSpawned: boolean
    //REMOVE isDespawned
    //isDespawned: boolean
    isPlayerCamera: boolean
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
    setPlayerCamera: (userId: string, isCamera: boolean) => void
    getSpacecraftSpawnPosition: () => THREE.Vector3
    updatePlayerState: (userId: string, updates: Partial<Pick<Player, 'position' | 'rotation'  | 'isSpawned'>>) => void
    
    // Getters
    getPlayer: (userId: string) => Player | undefined
    getControllerPlayer: () => Player | undefined
    getAllSpawnedPlayers: () => Player[]
    getPlayerCamera: (userId: string) => boolean
    
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
                        isPlayerCamera: false,
                        nickname: nicknames[userId] || '',
                        userId,
                        position: new THREE.Vector3(0, 0, 0),
                        rotation: new THREE.Euler(),
                        meshRef: null
                    }
                }
            })
            
            return { players: newPlayers }
        })
    },
    
    // Individual player actions
    getSpacecraftSpawnPosition: () => {
        // Position du vaisseau + offset pour spawn dessus
        const spacecraftPosition = new THREE.Vector3(-17, 0.1, 75)
        const spawnOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 10, // Aléatoire sur X
            2, // Au-dessus du vaisseau
            (Math.random() - 0.5) * 10  // Aléatoire sur Z
        )
        return spacecraftPosition.add(spawnOffset)
    },
    
    // Fonction modifiée pour spawn sur le vaisseau
    spawnPlayer: (userId: string, pos?: THREE.Vector3) =>
        set((state) => {
            // Si pas de position fournie, utiliser la position du vaisseau
            const spawnPosition = pos || get().getSpacecraftSpawnPosition()
            
            return {
                players: state.players.map((player) =>
                    player.userId === userId 
                        ? { 
                            ...player, 
                            isSpawned: true,
                            position: spawnPosition.clone(),
                        }
                        : player
                )
            }
        }),
    
    despawnPlayer: (userId: string) =>
       
        set((state) => ({
            
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { ...player, isSpawned: false }
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

    updatePlayerState: (userId: string, updates: Partial<Pick<Player, 'position' | 'rotation' | 'isSpawned'>>) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId 
                    ? { 
                        ...player, 
                        ...updates,
                        position: updates.position ? updates.position.clone() : player.position,
                        rotation: updates.rotation ? updates.rotation.clone() : player.rotation,
                    }
                    : player
            )
        })),

    setPlayerCamera: (userId: string, isCamera: boolean) =>
        set((state) => ({
            players: state.players.map((player) =>
                player.userId === userId ? { ...player, isPlayerCamera: isCamera } : player
            )
        })),
    
    // Getters
    getPlayer: (userId: string) =>
        get().players.find((player) => player.userId === userId),
    
    getControllerPlayer: () =>
        get().players.find((player) => player.isPlayerController),
    
    getAllSpawnedPlayers: () =>
        get().players.filter((player) => player.isSpawned),
    
    getPlayerCamera: (userId: string) =>
        get().players.find((player) => player.userId === userId && player.isPlayerCamera) !== undefined,
    
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
        const usersChanged = JSON.stringify(connectedUsersRef.current) !== JSON.stringify(connectedUsers.map(user => user.userId))
        const nicknamesChanged = JSON.stringify(nicknamesRef.current) !== JSON.stringify(nicknames)
        
        if (usersChanged || nicknamesChanged) {
            connectedUsersRef.current = connectedUsers.map(user => user.userId)
            nicknamesRef.current = nicknames as unknown as Record<string, string>
            syncWithConnectedUsers(connectedUsersRef.current, nicknamesRef.current)
        }
    }, [connectedUsers, nicknames, syncWithConnectedUsers])
}


// Ajoute dans playersStore.ts //

export const usePlayerStateSyncManager = (userId: string) => {

    const [reactTogetherPosition, setReactTogetherPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
    const [reactTogetherRotation, setReactTogetherRotation] = useStateTogether(`player_rotation_${userId}`, 0)
    const [reactTogetherSpawned, setReactTogetherSpawned] = useStateTogether(`player_spawned_${userId}`, false)

    const updatePlayerState = usePlayerStore(state => state.updatePlayerState)
    const getPlayer = usePlayerStore(state => state.getPlayer)

    const lastPositionRef = React.useRef<number[]>([0, 0, 0])
    const lastRotationRef = React.useRef<number>(0)
    const lastSpawnedRef = React.useRef<boolean>(false)
    const isUpdatingFromStore = React.useRef<boolean>(false)

    React.useEffect(() => {
        if (isUpdatingFromStore.current) return
        
        if (reactTogetherPosition && reactTogetherPosition.length === 3) {
            const pos = new THREE.Vector3(reactTogetherPosition[0], reactTogetherPosition[1], reactTogetherPosition[2])
            const hasPositionChanged = 
                Math.abs(lastPositionRef.current[0] - pos.x) > 0.001 ||
                Math.abs(lastPositionRef.current[1] - pos.y) > 0.001 ||
                Math.abs(lastPositionRef.current[2] - pos.z) > 0.001
            
            if (hasPositionChanged) {
                lastPositionRef.current = [pos.x, pos.y, pos.z]
                updatePlayerState(userId, { position: pos })
            }
        }
    }, [reactTogetherPosition, userId, updatePlayerState])

    React.useEffect(() => {
        if (isUpdatingFromStore.current) return
        
        if (typeof reactTogetherRotation === 'number') {
            const rot = new THREE.Euler(0, reactTogetherRotation, 0)
            const hasRotationChanged = Math.abs(lastRotationRef.current - reactTogetherRotation) > 0.001
            
            if (hasRotationChanged) {
                lastRotationRef.current = reactTogetherRotation
                updatePlayerState(userId, { rotation: rot })
            }
        }
    }, [reactTogetherRotation, userId, updatePlayerState])

    React.useEffect(() => {
        if (isUpdatingFromStore.current) return
        
        const hasSpawnedChanged = lastSpawnedRef.current !== reactTogetherSpawned
        
        if (hasSpawnedChanged) {
            lastSpawnedRef.current = reactTogetherSpawned
            updatePlayerState(userId, { 
                isSpawned: reactTogetherSpawned,
            })
        }
    }, [reactTogetherSpawned, userId, updatePlayerState])
    


    const updatePosition = React.useCallback((position: THREE.Vector3, rotation: number) => {
        const newPos = [position.x, position.y, position.z]
        const hasPositionChanged = 
            Math.abs(lastPositionRef.current[0] - position.x) > 0.001 ||
            Math.abs(lastPositionRef.current[1] - position.y) > 0.001 ||
            Math.abs(lastPositionRef.current[2] - position.z) > 0.001
        const hasRotationChanged = Math.abs(lastRotationRef.current - rotation) > 0.001
        
        if (hasPositionChanged || hasRotationChanged) {
            isUpdatingFromStore.current = true
            
            if (hasPositionChanged) {
                lastPositionRef.current = newPos
                setReactTogetherPosition(newPos)
                updatePlayerState(userId, { position })
            }
            
            if (hasRotationChanged) {
                lastRotationRef.current = rotation
                setReactTogetherRotation(rotation)
                updatePlayerState(userId, { rotation: new THREE.Euler(0, rotation, 0) })
            }
            
            // Reset flag après un délai
            setTimeout(() => {
                isUpdatingFromStore.current = false
            }, 50)
        }
    }, [setReactTogetherPosition, setReactTogetherRotation, userId, updatePlayerState])


    const updateSpawned = React.useCallback((spawned: boolean) => {
        if (lastSpawnedRef.current !== spawned) {
            isUpdatingFromStore.current = true
            lastSpawnedRef.current = spawned
            setReactTogetherSpawned(spawned)
            updatePlayerState(userId, { 
                isSpawned: spawned,
            })
            
            // Reset flag après un délai
            setTimeout(() => {
                isUpdatingFromStore.current = false
            }, 50)
        }
    }, [setReactTogetherSpawned, userId, updatePlayerState])
    
    const player = getPlayer(userId)


    return {
        // État actuel du joueur depuis le store
        player,
        playerPosition: player?.position || new THREE.Vector3(),
        playerRotation: player?.rotation || new THREE.Euler(),
     
        isSpawned: player?.isSpawned || false,
        
        // Méthodes de mise à jour (qui synchronisent automatiquement avec react-together)
        updatePosition,
        updateSpawned,
        
        // États bruts de react-together (pour debug si nécessaire)
        reactTogetherState: {
            position: reactTogetherPosition,
            rotation: reactTogetherRotation,
            spawned: reactTogetherSpawned
        }
    }
}


