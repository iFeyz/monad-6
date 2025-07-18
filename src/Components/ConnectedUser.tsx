import { useConnectedUsers } from 'react-together'

export default function ConnectedUser() {
    const connectedUsers = useConnectedUsers()
    console.log(connectedUsers)
    return (
        <div>
            <h1>Connected User</h1>
            <ul>
                {connectedUsers.map((user) => (
                    <li key={user.userId}>{user.nickname || `User ${user.userId.slice(0, 8)}`}</li>
                ))}
            </ul>
        </div>
    )
}