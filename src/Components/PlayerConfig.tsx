import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useConnectedUsers, useNicknames } from "react-together"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character",
    }),
})

type FormSchema = z.infer<typeof formSchema>

export function PlayerConfig() {

    const [nickname, setNickname] = useNicknames()
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
        </div>
    )
}