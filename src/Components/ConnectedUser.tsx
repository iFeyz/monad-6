import { useConnectedUsers } from 'react-together'

export default function ConnectedUser() {
    const connectedUsers = useConnectedUsers()
    console.log(connectedUsers)
    return (
        <div > 
            <h1 className="text-sm font-bold ">Connected User</h1>
            <ul className="text-sm gap-2 flex flex-1 items-start max-w-[300px] w-full">
                {connectedUsers.map((user) => (
                    <li className="bg-white/30 max-w-[300px] w-full backdrop-blur-xl p-2 rounded-md" key={user.userId}>{user.nickname.length > 10 ? user.nickname.slice(0, 10)+"..." : user.nickname}</li>
                ))}
            </ul>
        </div>
    )
}