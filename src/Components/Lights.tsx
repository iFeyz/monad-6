import { Environment } from '@react-three/drei'

const Lights = () => {
  return (
    <>
    <ambientLight />
    <pointLight position={[10, 10, 10]} />
    <Environment preset="sunset" />
    </>
  )
}

export default Lights