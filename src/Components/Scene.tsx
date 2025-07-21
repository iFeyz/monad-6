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
import { ProceduralPlanet } from "./ProceduralPlanet"
import { ProceduralGalaxy } from "./GalaxyGeneration"
import spaceCraft from "/spaceCraft.glb?url"
import { useThree } from "@react-three/fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

export const Scene = () => {
    const spaceRigibBody = useRef<any>(null)
    
    useFrame((state, delta) => {
        if (spaceRigibBody.current) {
            // Solution 1: Forcer la vélocité angulaire à chaque frame
            const rotationSpeed = 0.01
            spaceRigibBody.current.setAngvel({ x: 0, y: rotationSpeed, z: 0 }, true) // true = wake up the body
            
            // Solution 2: Alternative si la solution 1 ne marche pas
            // spaceRigibBody.current.resetForces(true)
            // spaceRigibBody.current.resetTorques(true)
            // spaceRigibBody.current.setAngvel({ x: rotationSpeed, y: 0, z: 0 }, true)
            
            // Solution 3: Si les autres solutions ne marchent pas, manipulation directe
            // const currentQuat = spaceRigibBody.current.rotation()
            // const deltaRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed * delta)
            // spaceRigibBody.current.setRotation(currentQuat.multiply(deltaRotation), true)
        }
    })

    //Load the space ship
    const space = useGLTF(spaceCraft)
    
    return (
        <> 
            <>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 100, 10]} intensity={0.8} />
                <directionalLight position={[50, 50, 50]} intensity={0.5} />
                <Environment preset="night" />
            </>

            <Physics gravity={[0, -9.81, 0]} debug={true}>
                <RigidBody 
                    type="dynamic" 
                    colliders="trimesh" 
                    gravityScale={0} 
                    enabledRotations={[true, true, true]} 
                    enabledTranslations={[true, true, true]} 
                    ref={spaceRigibBody}
                    canSleep={false}
                >
                    <group position={[-17, 0.1, 75]} scale={100}>
                        <primitive object={space.scene.clone()} />
                    </group>
                </RigidBody>
          
                <PlayersManager/>
                <ShipManager/>
                <CameraSwitcher/>
                
                {/* Single planet for reference/testing */}
                <ProceduralPlanet/>
                
                {/* Procedural Galaxy with many planets */}
                <ProceduralGalaxy/>
            </Physics>
        </>
    )
}