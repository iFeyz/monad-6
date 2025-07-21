import "./App.css";
import { Canvas } from "@react-three/fiber";
import Lights from "./Components/Lights";
import Suzanne from "./Components/Suzanne";
import { Count } from "./Components/Count";
import ConnectedUser from "./Components/ConnectedUser";
import { PlayerConfig } from "./Components/PlayerConfig";
import { PlayersManager } from "./Components/PlayersManager";
import { Planet } from "./Components/Planet";
import CameraSwitcher from "./Components/CameraSwitcher";
import { Plane } from "./Components/Plane";
import { Physics } from "@react-three/rapier";
import { KeyboardControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { SpaceShip } from "./Components/SpaceShip";
import { CubeTextureLoader } from "three";
import { Scene } from "./Components/Scene";
import * as THREE from "three";
import { useEffect } from "react";
import ChatManager from "./Components/ChatManager";
import WalletManager from "./Components/WalletManager";
import SessionManager from "./Components/SessionManager";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyZ"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyQ"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
];

export default function App() {
  useEffect(() => {
    const handleClick = () => {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.requestPointerLock();
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 0.0025);
  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <div className="absolute top-2 left-2 z-10 bg-white/30 backdrop-blur-xl p-4 rounded-md gap-2 flex flex-col items-start max-w-sm w-full">
          <Count />
          <ConnectedUser />
          <PlayerConfig />
        </div>
        <Canvas>
          <Skybox />
          <Scene />
        </Canvas>
      </KeyboardControls>
      <div className="absolute bottom-5 right-5 px-2 py-1 rounded gap-2 flex text-neutral-50 bg-sky-600">
        <ChatManager />
        <WalletManager />
        <SessionManager />
      </div>
    </>
  );
}

function Skybox() {
  const { scene } = useThree();
  const loader = new CubeTextureLoader();
  const texture = loader.load([
    "px.png",
    "nx.png",
    "py.png",
    "ny.png",
    "pz.png",
    "nz.png",
  ]);

  scene.background = texture;
  return null;
}
