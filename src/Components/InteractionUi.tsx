import  { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useInteractionStore, type ActiveInteract } from '../Stores/interactStore'

// Composant pour afficher une UI d'interaction individuelle
function InteractionUI({ interaction }: { interaction: ActiveInteract }) {
    const { camera } = useThree()
    const textRef = useRef<any>(null)

    useFrame(() => {
        if (textRef.current) {
            textRef.current.lookAt(camera.position)
        }
    })

    const { config } = interaction

    // Si l'objet a une UI personnalisée, l'utiliser
    if (config.customUI) {
        return <>{config.customUI(interaction)}</>
    }

    // UI par défaut
    if (!config.showText) return null

    const position = config.position

    return (
        <group position={[position.x, position.y + 2, position.z]}>
            <mesh position={[0, 0, -0.01]}>
            
            <Text
                ref={textRef}
                fontSize={0.25}
                color="white"
                anchorX="center"
                anchorY="middle"
                onClick={() => config.onInteract?.(interaction)}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'default'}
            >
                {config.interactionText}
            </Text>
            </mesh>
        </group>
    )
}

// Gestionnaire pour toutes les UI d'interaction
export function InteractionUIManager() {
    const activeInteractions = useInteractionStore(state => state.activeInteractObject)

    return (
        <>
            {activeInteractions.map((interaction, index) => (
                <InteractionUI
                    key={`${interaction.objectId}-${interaction.playerId}-${index}`}
                    interaction={interaction}
                />
            ))}
        </>
    )
}