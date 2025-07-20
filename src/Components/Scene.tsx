import { useLoader } from "@react-three/fiber"
import { Environment, useGLTF } from "@react-three/drei"
import manta from "/manta.glb?url"  
import { Group } from "three"
import * as THREE from "three"
import CameraSwitcher from "./CameraSwitcher"
import { PlayersManager } from "./PlayersManager"
import { Physics } from "@react-three/rapier"
import { PivotControls } from "@react-three/drei"
import SpaceShipController from "./SpaceShipController"

export const Scene = () => {
    //Load the space ship
    const scene: Group = useGLTF(manta).scene;
    return (
    <> 
        <primitive object={scene} scale={7.0} position={[0, 0, 0]}/>;
        <PivotControls
            offset={[0, 1, 0]}
        >
        <mesh
        geometry={new THREE.SphereGeometry(1, 128, 128)}
        material={new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            roughness: 0.5,
            metalness: 0.5,
        })}
        />
        </PivotControls>

        <>
            <ambientLight intensity={0.1} />
            <pointLight position={[10, 100, 10]}/>
            <Environment preset="night" />
        </>

        <Physics >
            <SpaceShipController/>
            <CameraSwitcher/>
           {/* <PlayersManager/> */}
        </Physics>

    </>
)
}
