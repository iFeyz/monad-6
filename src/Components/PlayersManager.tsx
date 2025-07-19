import { usePlayer } from '../Hooks/usePlayer'
import { useEffect } from 'react'
import { useStateTogether } from 'react-together'
import { Player } from './Player'
import { PlayerController } from './PlayerController'

export function PlayersManager() {
  const { localPlayer, allPlayers, spawnPlayer } = usePlayer()

  useEffect(() => {
    spawnPlayer()
  }, [spawnPlayer])

  const playerColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
    '#a29bfe', '#fd79a8', '#00b894', '#e17055', '#81ecec'
  ]

  return (
    <>
      {allPlayers.map((user, index) => {
        const isCurrentUser = user.userId === localPlayer?.userId
        const playerColor = playerColors[index % playerColors.length]

        return (
          <PlayerPositionSync
            key={user.userId}
            userId={user.userId}
            nickname={user.nickname}
            isCurrentUser={isCurrentUser}
            color={playerColor}
          />
        )
      })}
    </>
  )
}

function PlayerPositionSync({ userId, nickname, isCurrentUser, color }: {
    userId: string
    nickname: string
    isCurrentUser: boolean
    color: string
  }) {
    const [playerPosition] = useStateTogether(`player_${userId}`, [0, 0, 0])
    const [playerRotation] = useStateTogether(`player_rotation_${userId}`, 0)
    console.log(playerRotation);
  
    return (
      <>
        {isCurrentUser ? (
          <PlayerController
            userId={userId}
            nickname={nickname}
  
            
          />
        ) : (
          <Player
            position={playerPosition as [number, number, number]}
            rotation={playerRotation}
            nickname={nickname}
            isCurrentUser={false}
            color={color}
          />
        )}
      </>
    )
  }