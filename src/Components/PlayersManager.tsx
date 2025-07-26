import { usePlayerStore, usePlayerSync } from '../Stores/playersStore'
import { PlayerController } from './PlayerController'
import { useEffect } from 'react'

export function PlayersManager() {
    // Automatically synchronize with react-together
    usePlayerSync()
    
    // Get all players from store
    const players = usePlayerStore(state => state.players)
    
    useEffect(() => {
        console.log('Players in store:', players.map(p => ({ 
            userId: p.userId, 
            nickname: p.nickname, 
            isSpawned: p.isSpawned,
            position: p.position.toArray(),
            rotation: p.rotation.y
        })))
    }, [players])

    return (
        <>
            {players.map((player) => (
                <PlayerController 
                    key={player.userId}
                    nickname={player.nickname} 
                    userId={player.userId} 
                />
            ))}
        </>
    )
}