import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useConnectedUsers, useNicknames } from "react-together"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { usePlayerPositionSync, usePlayerStore, usePlayerSyncState } from "@/Stores/playersStore"
import { useMyId } from "react-together"


const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character",
    }),
})

type FormSchema = z.infer<typeof formSchema>

export function PlayerConfig() {

    const [nickname, setNickname] = useNicknames()
    const despawnPlayer = usePlayerStore(state => state.despawnPlayer)
    const spawnPlayer = usePlayerStore(state => state.spawnPlayer)
    const myId = useMyId()
    const { updateDespawn } = usePlayerSyncState(myId || "")

    const connectedUsers = useConnectedUsers()
   
    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
        },
    })

    function onSubmit(values : z.infer<typeof formSchema>) {
        setNickname(values.username)
    }

    return (
        <div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                <Input {...form.register("username")} />
                <Button type="submit">Submit</Button>

            </form>
            <Button onClick={() => {
    if (myId) {
        despawnPlayer(myId)
        updateDespawn(true)
    }
}}>Despawn {myId}</Button>

<Button onClick={() => {
    if (myId) {
        spawnPlayer(myId)
        updateDespawn(false)
    }
}}>Spawn {myId}</Button>
        </div>
    )
}