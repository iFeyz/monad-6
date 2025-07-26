import { useLoader } from "@react-three/fiber"
import { Environment, useGLTF } from "@react-three/drei"
import manta from "/manta.glb?url"
import { Group } from "three"
import * as THREE from "three"
import CameraSwitcher from "./CameraSwitcher"
import { PlayersManager } from "./PlayersManager"
import { Physics, RigidBody } from "@react-three/rapier"
import { PivotControls } from "@react-three/drei"
import SpaceShipController from "./SpaceShipController"
import ShipManager from "./ShipManager"
import PerformanceStats from "./PerformanceStats"
import { ProceduralPlanet } from "./ProceduralPlanet"
import { ProceduralGalaxy } from "./GalaxyGeneration"
import spaceCraft from "/spaceCraft.glb?url"
import spaceCraft2 from "/spaceCraft2.glb?url"
import { useThree } from "@react-three/fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { InteractiveObjects } from "./InteractiveObjects"
import RocketThrust from "./RocketThrust"
// NOUVEAUX IMPORTS
import { InteractionManager } from "./InteractionManager"
import SwordSlash from "./SwordSlash"

export const Scene = () => {
    const spaceRigibBody = useRef<any>(null)
    
    useFrame((state, delta) => {
        //ROTATION
      //  if (spaceRigibBody.current) {
            //const rotationSpeed = 0.01
            //spaceRigibBody.current.setAngvel({ x: 0, y: rotationSpeed, z: 0 }, true)
        //}
    })

    const space = useGLTF(spaceCraft)
    const space2 = useGLTF(spaceCraft2)

    return (
        <> 
                    <PerformanceStats />

            <>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 100, 10]} intensity={0.8} />
                <directionalLight position={[50, 50, 50]} intensity={0.5} />
                <Environment preset="night" />
            </>

            <Physics gravity={[0, -10, 0]} debug={true}>
                <RigidBody 
                    type="dynamic" 
                    colliders="trimesh" 
                    gravityScale={0} 
                    enabledRotations={[true, true, true]} 
                    enabledTranslations={[true, true, true]} 
                    ref={spaceRigibBody}
                    canSleep={false}
                >
                    <group position={[-200, 300, 300]} scale={100}>
                        <primitive object={space.scene.clone()} />
                    </group>
                </RigidBody>
                <RigidBody 
                    type="fixed" 
                    colliders="trimesh" 
                    gravityScale={0} 
                    enabledRotations={[true, true, true]} 
                    enabledTranslations={[true, true, true]} 
                    ref={spaceRigibBody}
                    canSleep={false}
                >
            
                
                <group position={[0, -8.8, -20]} scale={0.5}>
                    <primitive object={space2.scene.clone()} />
                </group>
                </RigidBody>

                {/* SPAWN  PLANE SURFACE */}
           
                <PlayersManager/>
                <ShipManager/>
                <CameraSwitcher/>
                
                {/* NOUVEAU: Système d'interaction */}
                <InteractionManager />
                <InteractiveObjects/>
                <group position={[10, 1, 1]} rotation={[0, Math.PI/2, 0]}>
                    <SwordSlash/>
                </group>
                <ProceduralPlanet/>
                <ProceduralGalaxy/>
            </Physics>
        </>
    )
}