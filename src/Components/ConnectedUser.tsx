import { useConnectedUsers } from 'react-together'
import { Users, User, Crown, Wifi } from 'lucide-react'

export default function ConnectedUser() {
    const connectedUsers = useConnectedUsers()
    
    // Get user status colors
    const getStatusColor = (userId: string) => {
        // You can add logic here to determine user status
        // For now, using different colors for variety
        const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
        return colors[userId.length % colors.length];
    }

    const formatNickname = (nickname: string | undefined) => {
        if (!nickname) return 'Anonymous';
        return nickname.length > 12 ? nickname.slice(0, 12) + "..." : nickname;
    }

    return (
        <div className="bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-lg p-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">Connected Users</h2>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-mono">{connectedUsers.length}</span>
                </div>
            </div>

            {/* Users List */}
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {connectedUsers.length === 0 ? (
                    <div className="text-center py-3">
                        <User className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">No users connected</p>
                    </div>
                ) : (
                    connectedUsers.map((user, index) => (
                        <div 
                            key={user.userId}
                            className="flex items-center gap-2 bg-gray-900/50 border border-gray-700/50 rounded-md p-2 hover:bg-gray-800/50 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="relative">
                                <div className={`w-6 h-6 ${getStatusColor(user.userId)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                                    {user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                                </div>
                                {/* Online status indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 border border-gray-900 rounded-full"></div>
                                {/* Host crown for first user */}
                                {index === 0 && (
                                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <p className="text-xs font-medium text-white truncate">
                                        {formatNickname(user.nickname)}
                                    </p>
                                    {index === 0 && (
                                        <span className="text-xs text-yellow-400 font-bold">HOST</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 font-mono truncate">
                                    ID: {user.userId.slice(0, 8)}...
                                </p>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-400">Online</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            {connectedUsers.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Session active</span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Synchronized
                        </span>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(75, 85, 99, 0.3);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.5);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 92, 246, 0.7);
                }
            `}</style>
        </div>
    )
}