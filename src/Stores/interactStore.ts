import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { Vector3, Euler } from "three"
import React from "react"
import { usePlayerStore } from "./playersStore" 


type InteractObject = {
    type: string
    position: Vector3
    rotation: Euler
    scale: Vector3
    isInteractable: boolean
    

    radius?: number
    interactionText?: string
    showText?: boolean
    interactionKey?: string
    

    onInteract?: (interaction: ActiveInteract) => void
    onEnter?: (interaction: ActiveInteract) => void
    onExit?: () => void
    
    customUI?: (interaction: ActiveInteract) => React.ReactNode
    

    metadata?: Record<string, any>
}

type ActiveInteract = {
    playerId: string
    objectId: string
    config: InteractObject
    distance: number
    playerPosition: Vector3
}

type InteractionStoreState = {
    interactiveObjects: Map<string, InteractObject>
    activeInteractObject: ActiveInteract[]
    
    registerInteractiveObject: (id: string, config: InteractObject) => void
    unregisterInteractiveObject: (id: string) => void
    updateInteractiveObject: (id: string, updates: Partial<InteractObject>) => void
    
    updateInteractions: () => void
    
    getObjectById: (id: string) => InteractObject | undefined
    getInteractionsForObject: (objectId: string) => ActiveInteract[]
    getInteractionsForPlayer: (playerId: string) => ActiveInteract[]
    triggerInteractionsForPlayer: (playerId: string, key?: string) => void
    
    enableObject: (id: string) => void
    disableObject: (id: string) => void
    setObjectText: (id: string, text: string) => void
    moveObject: (id: string, position: Vector3) => void
    
    getStats: () => {
        totalObjects: number
        activeObjects: number
        totalInteractions: number
        playersWithInteractions: number
    }
    clearAllInteractions: () => void
}

export const useInteractionStore = create(
    subscribeWithSelector<InteractionStoreState>((set, get) => ({
        interactiveObjects: new Map(),
        activeInteractObject: [],
        
        registerInteractiveObject: (id: string, config: InteractObject) => {
            const { interactiveObjects } = get()
            const newObjects = new Map(interactiveObjects)
            
            const completeConfig: InteractObject = {
                radius: 1,
                interactionText: "Appuyez sur E pour interagir",
                showText: true,
                interactionKey: "e",
                ...config
            }
            
            newObjects.set(id, completeConfig)
            set({ interactiveObjects: newObjects })
        },

        unregisterInteractiveObject: (id: string) => {
            const { interactiveObjects } = get()
            const newObjects = new Map(interactiveObjects)
            newObjects.delete(id)
            set({ interactiveObjects: newObjects })
        },

        updateInteractiveObject: (id: string, updates: Partial<InteractObject>) => {
            const { interactiveObjects } = get()
            const existingConfig = interactiveObjects.get(id)
            if (existingConfig) {
                const newObjects = new Map(interactiveObjects)
                newObjects.set(id, { ...existingConfig, ...updates })
                set({ interactiveObjects: newObjects })
            }
        },

        updateInteractions: () => {
            const { interactiveObjects } = get()
            const playerStore = usePlayerStore.getState()
            const spawnedPlayers = playerStore.getAllSpawnedPlayers()
            
            const interactions: ActiveInteract[] = []
            
            spawnedPlayers.forEach((player: any) => {
                if (!player.isSpawned || !player.position) return
                
                for (const [objectId, config] of interactiveObjects) {
                    if (!config.isInteractable) continue
                    
                    const playerPos = player.position
                    const objectPos = config.position
                    const distance = playerPos.distanceTo(objectPos)
                    const radius = config.radius || 1
                    
                    if (distance <= radius) {
                        interactions.push({
                            playerId: player.userId,
                            objectId,
                            config,
                            distance,
                            playerPosition: playerPos.clone()
                        })
                    }
                }
            })
            
            const currentInteractions = get().activeInteractObject
            const newInteractions = interactions.filter(newInt => 
                !currentInteractions.some(curInt => 
                    curInt.playerId === newInt.playerId && curInt.objectId === newInt.objectId
                )
            )
            
            const endedInteractions = currentInteractions.filter(curInt =>
                !interactions.some(newInt =>
                    newInt.playerId === curInt.playerId && newInt.objectId === curInt.objectId
                )
            )
            
            newInteractions.forEach(interaction => {
                if (interaction.config.onEnter) {
                    interaction.config.onEnter(interaction)
                }
            })
            
            endedInteractions.forEach(interaction => {
                if (interaction.config.onExit) {
                    interaction.config.onExit()
                }
            })
            
            set({ activeInteractObject: interactions })
        },

        getObjectById: (id: string) => {
            return get().interactiveObjects.get(id)
        },

        getInteractionsForObject: (objectId: string) => {
            return get().activeInteractObject.filter(i => i.objectId === objectId)
        },

        getInteractionsForPlayer: (playerId: string) => {
            return get().activeInteractObject.filter(i => i.playerId === playerId)
        },

        triggerInteractionsForPlayer: (playerId: string, key: string = "e") => {
            const interactions = get().getInteractionsForPlayer(playerId)
            interactions.forEach(interaction => {
                const interactionKey = interaction.config.interactionKey || "e"
                if (interactionKey === key.toLowerCase() && interaction.config.onInteract) {
                    interaction.config.onInteract(interaction)
                }
            })
        },

        enableObject: (id: string) => {
            get().updateInteractiveObject(id, { isInteractable: true })
        },

        disableObject: (id: string) => {
            get().updateInteractiveObject(id, { isInteractable: false })
        },

        setObjectText: (id: string, text: string) => {
            get().updateInteractiveObject(id, { interactionText: text })
        },

        moveObject: (id: string, position: Vector3) => {
            get().updateInteractiveObject(id, { position: position.clone() })
        },

        getStats: () => {
            const { interactiveObjects, activeInteractObject } = get()
            const activeObjects = Array.from(interactiveObjects.values()).filter(obj => obj.isInteractable).length
            const playersWithInteractions = new Set(activeInteractObject.map(i => i.playerId)).size
            
            return {
                totalObjects: interactiveObjects.size,
                activeObjects,
                totalInteractions: activeInteractObject.length,
                playersWithInteractions
            }
        },

        clearAllInteractions: () => {
            set({ activeInteractObject: [] })
        }
    }))
)

export const useInteractiveObject = ({
    id,
    type,
    position,
    rotation = new Euler(0, 0, 0),
    scale = new Vector3(1, 1, 1),
    radius = 1,
    interactionText = "Appuyez sur E pour interagir",
    showText = true,
    interactionKey = "e",
    onInteract,
    onEnter,
    onExit,
    customUI,
    enabled = true,
    metadata = {}
}: {
    id: string
    type: string
    position: Vector3 | [number, number, number]
    rotation?: Euler | [number, number, number]
    scale?: Vector3 | [number, number, number]
    radius?: number
    interactionText?: string
    showText?: boolean
    interactionKey?: string
    onInteract?: (interaction: ActiveInteract) => void
    onEnter?: (interaction: ActiveInteract) => void
    onExit?: () => void
    customUI?: (interaction: ActiveInteract) => React.ReactNode
    enabled?: boolean
    metadata?: Record<string, any>
}) => {
    const registerInteractiveObject = useInteractionStore(state => state.registerInteractiveObject)
    const unregisterInteractiveObject = useInteractionStore(state => state.unregisterInteractiveObject)
    const updateInteractiveObject = useInteractionStore(state => state.updateInteractiveObject)
    const getInteractionsForObject = useInteractionStore(state => state.getInteractionsForObject)
    
    const positionVec3 = Array.isArray(position) ? new Vector3(...position) : position
    const rotationEuler = Array.isArray(rotation) ? new Euler(...rotation) : rotation
    const scaleVec3 = Array.isArray(scale) ? new Vector3(...scale) : scale
    
    React.useEffect(() => {
        if (!enabled) return
        
        const config: InteractObject = {
            type,
            position: positionVec3,
            rotation: rotationEuler,
            scale: scaleVec3,
            isInteractable: true,
            radius,
            interactionText,
            showText,
            interactionKey,
            onInteract,
            onEnter,
            onExit,
            customUI,
            metadata
        }
        
        registerInteractiveObject(id, config)
        
        return () => {
            unregisterInteractiveObject(id)
        }
    }, [id, enabled])
    
    React.useEffect(() => {
        if (enabled) {
            updateInteractiveObject(id, {
                position: positionVec3,
                rotation: rotationEuler,
                scale: scaleVec3,
                radius,
                interactionText,
                showText,
                interactionKey,
                onInteract,
                onEnter,
                onExit,
                customUI,
                metadata
            })
        }
    }, [positionVec3, rotationEuler, scaleVec3, radius, interactionText, showText, interactionKey, enabled])
    
    const interactions = getInteractionsForObject(id)
    const isNearby = interactions.length > 0
    const playersNearby = interactions.map(i => i.playerId)
    
    return {
        isNearby,
        interactions,
        playersNearby,
        triggerInteraction: () => {
            interactions.forEach(interaction => {
                if (interaction.config.onInteract) {
                    interaction.config.onInteract(interaction)
                }
            })
        }
    }
}

export const usePlayerInteractions = (playerId: string) => {
    const getInteractionsForPlayer = useInteractionStore(state => state.getInteractionsForPlayer)
    const triggerInteractionsForPlayer = useInteractionStore(state => state.triggerInteractionsForPlayer)
    
    const interactions = getInteractionsForPlayer(playerId)
    const hasInteractions = interactions.length > 0
    
    return {
        interactions,
        hasInteractions,
        nearbyObjects: interactions.map(i => i.objectId),
        triggerInteraction: (key?: string) => triggerInteractionsForPlayer(playerId, key)
    }
}

export const useInteractionStats = () => {
    return useInteractionStore(state => state.getStats())
}

export type { InteractObject, ActiveInteract, InteractionStoreState }