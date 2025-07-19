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

const keyboardMap = [
  { name : "forward", keys: ["ArrowUp", "KeyZ"]},
  { name : "backward", keys: ["ArrowDown", "KeyS"]},
  { name : "left", keys: ["ArrowLeft", "KeyQ"]},
  { name : "right", keys: ["ArrowRight", "KeyD"]},
]

function App() {

  return (
    <>
    <KeyboardControls map={keyboardMap}>
      <div className="absolute top-2 left-2 z-10 bg-white/30 backdrop-blur-xl p-4 rounded-md gap-2 flex flex-col items-start max-w-sm w-full">
      <Count />
      <ConnectedUser />
      <PlayerConfig />
      </div>
      <Canvas camera={{ position: [0, 5, 5], fov: 60 }}>
        <Skybox />
        <Scene />
      </Canvas>
      </KeyboardControls>
    </>
  );
}


export default App;


function Skybox() {
  const { scene } = useThree();
  const loader = new CubeTextureLoader();
  const texture = loader.load([
    
    "/front.png",
    "/back.png",
    "/top.png",
    "/bottom.png",
    "/left.png",
    "/right.png",
  ])

  scene.background = texture;
  return null;
  
}

