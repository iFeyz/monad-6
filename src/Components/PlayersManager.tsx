import { useConnectedUsers, useNicknames } from 'react-together'
import { useStateTogether } from 'react-together'
import { Player } from './Player'
import { PlayerController } from './PlayerController'

export function PlayersManager() {
  const connectedUsers = useConnectedUsers()
  const [nickname] = useNicknames()
  const currentUserId = connectedUsers.find(user => user.nickname === nickname)?.userId
  
  // Couleurs prédéfinies pour les joueurs
  const playerColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
    '#a29bfe', '#fd79a8', '#00b894', '#e17055', '#81ecec'
  ]

  return (
    <>
      {connectedUsers.map((user, index) => {
        const isCurrentUser = user.userId === currentUserId
        const playerColor = playerColors[index % playerColors.length]
        
        return (
          <PlayerPositionSync
            key={user.userId}
            userId={user.userId}
            nickname={user.nickname || `User ${user.userId.slice(0, 8)}`}
            isCurrentUser={isCurrentUser}
            color={playerColor}
          />
        )
      })}
      
      {/* Contrôleur pour l'utilisateur actuel */}
      {currentUserId && (
        <PlayerController 
          userId={currentUserId} 
          nickname={nickname || 'Anonymous'}
        />
      )}
    </>
  )
}

// Composant pour synchroniser la position d'un joueur
function PlayerPositionSync({ userId, nickname, isCurrentUser, color }: {
  userId: string
  nickname: string
  isCurrentUser: boolean
  color: string
}) {
  const [playerPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
  
  return (
    <Player
      position={playerPosition as [number, number, number]}
      nickname={nickname}
      isCurrentUser={isCurrentUser}
      color={color}
    />
  )
} 