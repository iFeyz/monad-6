import "./App.css";
import { Canvas } from "@react-three/fiber";
import Lights from "./Components/Lights";
import Suzanne from "./Components/Suzanne";
import { Count } from "./Components/Count";
import ConnectedUser from "./Components/ConnectedUser";
import { PlayerConfig } from "./Components/PlayerConfig";
import { PlayersManager } from "./Components/PlayersManager";

function App() {
  return (
    <>
      <Count />
      <ConnectedUser />
      <PlayerConfig />
      <Canvas camera={{ position: [0, 5, 5], fov: 60 }}>
        <Lights />
        <Suzanne />
        <gridHelper args={[20, 20]} />
        <PlayersManager />
      </Canvas>
    </>
  );
}

export default App;
