import { Environment, useGLTF } from "@react-three/drei"
import CameraSwitcher from "./CameraSwitcher"
import { PlayersManager } from "./PlayersManager"
import { Physics, RigidBody } from "@react-three/rapier"
import ShipManager from "./ShipManager"
import { ProceduralPlanet } from "./ProceduralPlanet"
import { ProceduralGalaxy } from "./GalaxyGeneration"
import spaceCraft from "/spaceCraft.glb?url"
import spaceCraft2 from "/spaceCraft2.glb?url"
import { useRef } from "react"
import { InteractiveObjects } from "./InteractiveObjects"
import { InteractionManager } from "./InteractionManager"

export const Scene = () => {
    const spaceRigibBody = useRef<any>(null)


    const space = useGLTF(spaceCraft)
    const space2 = useGLTF(spaceCraft2)

    return (
        <> 

            <>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 100, 10]} intensity={0.8} />
                <directionalLight position={[50, 50, 50]} intensity={0.5} />
                <Environment preset="night" />
            </>

            <Physics gravity={[0, -10, 0]}>
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

           
                <PlayersManager/>
                <ShipManager/>
                <CameraSwitcher/>
                
                <InteractionManager />
                <InteractiveObjects/>
        
                <ProceduralPlanet/>
                <ProceduralGalaxy/>
            </Physics>
        </>
    )
}