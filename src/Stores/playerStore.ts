import { create } from 'zustand'

type PlayerState = {
  isPlayerController: boolean
  setIsPlayerController: (v: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlayerController: false,
  setIsPlayerController: (v) => set({ isPlayerController: v }),
}))