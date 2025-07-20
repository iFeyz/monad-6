import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useConnectedUsers, useNicknames } from "react-together"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { usePlayerStore, usePlayerStateSyncManager } from "@/Stores/playersStore"
import { useMyId } from "react-together"

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character",
    }),
})

type FormSchema = z.infer<typeof formSchema>

export function PlayerConfig() {
    const [nickname, setNickname] = useNicknames()
    const myId = useMyId()
    
    // Utilise le nouveau hook unifié
    const { 
        player, 
        isSpawned, 
        updateSpawned 
    } = usePlayerStateSyncManager(myId || "")

    const connectedUsers = useConnectedUsers()
   
    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        setNickname(values.username)
    }

    const handleDespawn = () => {
        if (myId) {
            updateSpawned(false) // Cette méthode met à jour automatiquement le store ET react-together
        }
    }

    const handleSpawn = () => {
        if (myId) {
            updateSpawned(true) // Cette méthode met à jour automatiquement le store ET react-together
        }
    }

    return (
        <div className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                <Input {...form.register("username")} placeholder="Enter username" />
                <Button type="submit">Submit</Button>
            </form>
            
            <div className="flex gap-2">
                <Button 
                    onClick={handleDespawn}
                    disabled={!isSpawned}
                    variant={!isSpawned ? "secondary" : "destructive"}
                >
                    {isSpawned ? "Already Despawned" : `Despawn ${myId}`}
                </Button>

                <Button 
                    onClick={handleSpawn}
                    disabled={isSpawned}
                    variant={isSpawned ? "secondary" : "default"}
                >
                    {isSpawned ? "Already Spawned" : `Spawn ${myId}`}
                </Button>
            </div>
            
            {/* Debug info */}
            <div className="text-sm text-gray-500">
                <p>Current state: {isSpawned ? "Spawned" : "Despawned"}</p>
                <p>Player nickname: {player?.nickname || "No nickname"}</p>
                <p>Connected users: {connectedUsers.length}</p>
            </div>
        </div>
    )
}