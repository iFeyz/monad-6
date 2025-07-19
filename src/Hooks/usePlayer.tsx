import { useConnectedUsers, useNicknames } from "react-together"
import { useState, type ReactElement } from "react"
import { PlayerController } from "../Components/PlayerController"

export function usePlayer() {
  const connectedUsers = useConnectedUsers()
  const [nickname] = useNicknames()
  const [spawned, setSpawned] = useState(false)
  const [isPlayerController, setIsPlayerController] = useState(false)

  const currentUser = connectedUsers.find(user => user.nickname === nickname)
  const currentUserId = currentUser?.userId || null

  const localPlayer = currentUser
    ? {
        userId: currentUser.userId,
        nickname: currentUser.nickname || 'Anonymous',
      }
    : null

  const allPlayers = connectedUsers.map(user => ({
    userId: user.userId,
    nickname: user.nickname || `User ${user.userId.slice(0, 8)}`,
  }))

  function spawnPlayer() {
    if (!spawned && localPlayer) {
      setSpawned(true)
    }
  }

  const LocalPlayerController: ReactElement | null = spawned && localPlayer ? (
    <PlayerController
      key={localPlayer.userId}
      userId={localPlayer.userId}
      nickname={localPlayer.nickname}
    />
  ) : null

  return {
    localPlayer,
    allPlayers,
    spawnPlayer,
    LocalPlayerController,
    setIsPlayerController,
    isPlayerController,
  }
}
