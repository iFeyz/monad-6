import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useConnectedUsers, useNicknames, useMyId } from "react-together"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { usePlayerStore, usePlayerStateSyncManager } from "@/Stores/playersStore"
import { useShipStore, useShipSync } from "@/Stores/shipStore"
import * as THREE from 'three'
import React, { useState, useEffect } from "react"
import { Settings, X, LogOut, Users, Gamepad2, Rocket, User } from "lucide-react"

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character",
    }),
})

type FormSchema = z.infer<typeof formSchema>

interface PlayerConfigProps {
    onDisconnect?: () => void;
    onChangeSession?: () => void;
}

export function PlayerConfig({ onDisconnect, onChangeSession }: PlayerConfigProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [, setNickname] = useNicknames()
    const myId = useMyId()
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const setPlayerPosition = usePlayerStore(state => state.setPlayerPosition)
    const playerStateSyncManagerId = myId || "";

    const {
        player,
        isSpawned,
        updateSpawned
    } = usePlayerStateSyncManager(playerStateSyncManagerId)

    const { addShip, controlShip, leaveShip } = useShipSync();
    const connectedUsers = useConnectedUsers()

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: player?.nickname || "",
        },
    })

    // Handle ESC key to toggle menu
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);
    
    React.useEffect(() => {
        if (player?.nickname) {
            form.setValue("username", player.nickname);
        }
    }, [player?.nickname, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        setNickname(values.username)
    }

    const handleDespawnPlayer = () => {
        if (myId) {
            updateSpawned(false)
        }
    }

    const handleSpawnPlayer = () => {
        if (myId) {
            setPlayerPosition(myId, new THREE.Vector3(10, 0, 0));
            updateSpawned(true)
            setPlayerCamera(myId || "", true);
        }
    }

    const handleSpawnShip = () => {
        if (!myId) {
            console.warn("Cannot spawn ship: Local user ID not available.");
            return;
        }

        const controlledShip = useShipStore.getState().getControlledShip(myId);

        if (controlledShip) {
            console.log(`User ${myId} is already controlling ship ${controlledShip.id}.`);
            return;
        }

        const availableShip = useShipStore.getState().ships.find(ship => ship.isControlled === null);

        if (availableShip) {
            console.log(`User ${myId} taking control of existing ship ${availableShip.id}`);
            controlShip(availableShip.id, myId);
            updateSpawned(false);
        } else {
            const newShipId = `ship_${Date.now()}`;
            const spawnPosition = new THREE.Vector3(
                Math.random() * 20 - 10,
                0,
                Math.random() * 20 - 10
            );
            const spawnRotation = new THREE.Euler(0, 0, 0);

            console.log(`User ${myId} spawning and controlling new ship ${newShipId}`);
            addShip(newShipId, spawnPosition, spawnRotation);
            controlShip(newShipId, myId);
            updateSpawned(false);
        }
    }

    const handleLeaveShip = () => {
        const controlledShip = useShipStore.getState().getControlledShip(myId || '');
        if (controlledShip) {
            console.log(`User ${myId} leaving ship ${controlledShip.id}`);
            leaveShip(controlledShip.id);
            updateSpawned(true);
            setPlayerCamera(myId || "", true);
        }
    }

    const isControllingShip = useShipStore(state => {
        const ship = state.getControlledShip(myId || '');
        return !!ship;
    });

    // Toggle button (always visible)
    const ToggleButton = () => (
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="fixed top-4 right-4 z-50 w-12 h-12 bg-purple-500 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors border border-purple-400 shadow-lg backdrop-blur-sm"
        >
            {isOpen ? <X className="w-6 h-6 text-white" /> : <Settings className="w-6 h-6 text-white" />}
        </button>
    );

    if (!isOpen) {
        return <ToggleButton />;
    }

    return (
        <>
            <ToggleButton />
            
            {/* Game Menu Overlay */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="bg-black border border-purple-500 rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                <Gamepad2 className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-light text-white">Game Menu</h2>
                        </div>
                        <div className="text-purple-400 text-sm">
                            Press ESC to close
                        </div>
                    </div>

                    {/* Player Settings */}
                    <div className="space-y-6">
                        <div className="border-b border-gray-800 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-medium text-white">Player Settings</h3>
                            </div>
                            
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3 mb-4">
                                <Input 
                                    {...form.register("username")} 
                                    placeholder="Enter username" 
                                    className="flex-grow bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500"
                                />
                                <Button 
                                    type="submit"
                                    className="bg-purple-500 hover:bg-purple-600 text-white px-6"
                                >
                                    Set Name
                                </Button>
                            </form>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={handleDespawnPlayer}
                                    disabled={!isSpawned || isControllingShip}
                                    variant={(!isSpawned || isControllingShip) ? "secondary" : "destructive"}
                                    className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white disabled:opacity-50"
                                >
                                    {isSpawned ? "Despawn Player" : "Player Despawned"}
                                </Button>

                                <Button
                                    onClick={handleSpawnPlayer}
                                    disabled={isSpawned || isControllingShip}
                                    className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:bg-gray-800"
                                >
                                    {isSpawned ? "Player Active" : "Spawn Player"}
                                </Button>
                            </div>
                        </div>

                        {/* Ship Controls */}
                        <div className="border-b border-gray-800 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Rocket className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-medium text-white">Ship Controls</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={handleSpawnShip}
                                    disabled={isControllingShip}
                                    className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:bg-gray-800"
                                >
                                    {isControllingShip ? "In Ship" : "Board Ship"}
                                </Button>

                                <Button
                                    onClick={handleLeaveShip}
                                    disabled={!isControllingShip}
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:bg-gray-800"
                                >
                                    {isControllingShip ? "Leave Ship" : "Not in Ship"}
                                </Button>
                            </div>
                        </div>

                        {/* Session Info */}
                        <div className="border-b border-gray-800 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-medium text-white">Session Info</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 mb-1">Player Status</p>
                                    <p className="text-white">{isSpawned ? "Active" : "Inactive"}</p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 mb-1">Ship Status</p>
                                    <p className="text-white">{isControllingShip ? "Piloting" : "On Foot"}</p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 mb-1">Username</p>
                                    <p className="text-white">{player?.nickname || "No name set"}</p>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 mb-1">Connected Users</p>
                                    <p className="text-white">{connectedUsers.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Session Controls */}
                        <div className="flex gap-3">
                            <Button
                                onClick={onChangeSession}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white"
                            >
                                Change Session
                            </Button>
                            <Button
                                onClick={onDisconnect}
                                variant="destructive"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}