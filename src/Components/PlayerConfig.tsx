import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useConnectedUsers, useNicknames, useMyId } from "react-together"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { usePlayerStore, usePlayerStateSyncManager } from "@/Stores/playersStore"
import { useShipStore, useShipSync } from "@/Stores/shipStore"
import * as THREE from 'three'
import React from "react" // Ensure React is imported for React.useEffect

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character",
    }),
})

type FormSchema = z.infer<typeof formSchema>

export function PlayerConfig() {
    const [nickname, setNickname] = useNicknames()
    const myId = useMyId()
    const setPlayerCamera = usePlayerStore(state => state.setPlayerCamera)
    const playerStateSyncManagerId = myId || "";

    const {
        player,
        isSpawned,
        updateSpawned
    } = usePlayerStateSyncManager(playerStateSyncManagerId)

    // Corrected destructuring: remove removeShipControlledBy
    const { addShip, controlShip, leaveShip } = useShipSync();

    const connectedUsers = useConnectedUsers()

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: player?.nickname || "",
        },
    })
    
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
            updateSpawned(false); // Despawn player character
        } else {
            const newShipId = `ship_${Date.now()}`;
            const spawnPosition = new THREE.Vector3(
                Math.random() * 20 - 10,
                0, // Keep Y at 0 for ground spawn
                Math.random() * 20 - 10
            );
            const spawnRotation = new THREE.Euler(0, 0, 0);

            console.log(`User ${myId} spawning and controlling new ship ${newShipId}`);
            addShip(newShipId, spawnPosition, spawnRotation);
            controlShip(newShipId, myId); // Assign control to the new ship
            updateSpawned(false); // Despawn player character
        }
    }

    const handleLeaveShip = () => {
        const controlledShip = useShipStore.getState().getControlledShip(myId || '');
        console.log("handleLeaveShip - Controlled ship before leaving:", controlledShip);
        if (controlledShip) {
            console.log(`User ${myId} leaving ship ${controlledShip.id}`);
            leaveShip(controlledShip.id); // This now correctly sets isControlled to null
            updateSpawned(true); // Respawn the player character
            setPlayerCamera(myId || "", true);
        }
    }

    const isControllingShip = useShipStore(state => {
        const ship = state.getControlledShip(myId || '');
        return !!ship;
    });

    return (
        <div className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                <Input {...form.register("username")} placeholder="Enter username" className="flex-grow" />
                <Button type="submit">Set Nickname</Button>
            </form>

            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleDespawnPlayer}
                    disabled={!isSpawned || isControllingShip}
                    variant={(!isSpawned || isControllingShip) ? "secondary" : "destructive"}
                    className="flex-1 min-w-[120px]"
                >
                    {isSpawned ? `Despawn Player ${myId}` : "Player Despawned"}
                </Button>

                <Button
                    onClick={handleSpawnPlayer}
                    disabled={isSpawned || isControllingShip}
                    variant={(isSpawned || isControllingShip) ? "secondary" : "default"}
                    className="flex-1 min-w-[120px]"
                >
                    {isSpawned ? "Player Spawned" : `Spawn Player ${myId}`}
                </Button>

                <Button
                    onClick={handleSpawnShip}
                    disabled={isControllingShip}
                    variant={isControllingShip ? "secondary" : "default"}
                    className="flex-1 min-w-[120px]"
                >
                    {isControllingShip  ? "In Ship" : `Spawn Ship ${myId}`}
                </Button>

                <Button
                    onClick={handleLeaveShip}
                    disabled={!isControllingShip}
                    variant={!isControllingShip ? "secondary" : "destructive"}
                    className="flex-1 min-w-[120px]"
                >
                    {isControllingShip ? `Leave Ship ${myId}` : "Not in Ship"}
                </Button>
            </div>

            <div className="text-sm text-gray-500">
                <p>Current state: {isSpawned ? "Player Spawned" : "Player Despawned"}</p>
                <p>Controlling Ship: {isControllingShip ? "Yes" : "No"}</p>
                <p>Player nickname: {player?.nickname || "No nickname"}</p>
                <p>Connected users: {connectedUsers.length}</p>
            </div>
        </div>
    )
}