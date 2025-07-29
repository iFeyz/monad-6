import { usePlayerStore, usePlayerSync } from '../Stores/playersStore'
import { PlayerController } from './PlayerController'


export function PlayersManager() {
    // Automatically synchronize with react-together
    usePlayerSync()
    
    // Get all players from store
    const players = usePlayerStore(state => state.players)

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