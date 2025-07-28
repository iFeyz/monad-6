import { useEffect } from "react"
import { useMyId } from "react-together"
import { usePlayerStore, usePlayerStateSyncManager } from "@/Stores/playersStore"
import { useShipStore } from "@/Stores/shipStore"

export function PointerLockHandler() {
    const myId = useMyId()
    const playerStateSyncManagerId = myId || ""
    
    // Get player state
    const { isSpawned } = usePlayerStateSyncManager(playerStateSyncManagerId)
    const isPlayerCamera = usePlayerStore(state => state.getPlayerCamera(myId || ""))
    
    // Check if controlling a ship
    const isControllingShip = useShipStore(state => {
        const ship = state.getControlledShip(myId || '')
        return !!ship
    })

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            // Only proceed if clicking on the canvas
            const target = event.target as HTMLElement
            if (!target || target.tagName !== 'CANVAS') {
                return
            }

            // Check if we should lock the pointer
            const shouldLock = (isSpawned && isPlayerCamera) || isControllingShip
            
            if (shouldLock) {
                const canvas = document.querySelector('canvas')
                if (canvas) {
                    canvas.requestPointerLock()
                }
            }
        }

        // Add event listener to document to catch canvas clicks
        document.addEventListener('click', handleClick)
        
        return () => {
            document.removeEventListener('click', handleClick)
        }
    }, [isSpawned, isPlayerCamera, isControllingShip])

    // This component doesn't render anything
    return null
}