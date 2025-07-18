import suzanne from "/suzanne.glb?url";
import { useGLTF } from "@react-three/drei";
import { Group, Geometry } from "three";

const Suzanne = () => {
  const scene: Group = useGLTF(suzanne).scene;
  return <primitive object={scene} />;
};

export default Suzanne;
