import { usePlayerStore, usePlayerSync } from '@/Stores/playersStore'
import { PlayerController } from './PlayerController'
import { useEffect } from 'react'

export function PlayersManager() {
    // Synchronise automatiquement avec react-together
    usePlayerSync()
    
    // Récupère tous les players du store
    const players = usePlayerStore(state => state.players)
    
    useEffect(() => {
        console.log('Players in store:', players.map(p => ({ 
            userId: p.userId, 
            nickname: p.nickname, 
            isSpawned: p.isSpawned,
            position: p.position.toArray()
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