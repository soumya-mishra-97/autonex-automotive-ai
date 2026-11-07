import { Component, memo, type ReactNode, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Color, ExtrudeGeometry, Shape } from "three";
import { BoxyXuvModel } from "./BoxyXuvModel";
import { CarArtwork } from "../../components/CarArtwork";

interface Props {
  color: string;
  bodyType: string;
  name: string;
  interior?: boolean;
  angle: number;
  dark: boolean;
}

/** Presentation only: no repositories, workflow state, or business rules. */
function CarModel({
  color,
  bodyType,
  interior = false,
}: Pick<Props, "color" | "bodyType" | "interior">) {
  const suv = bodyType === "suv";
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-2.35, 0.42);
    shape.lineTo(-2.38, 0.77);
    shape.quadraticCurveTo(-2.3, 0.95, -1.8, 0.98);
    shape.lineTo(-0.95, 1.02);
    shape.lineTo(-0.35, suv ? 1.73 : 1.48);
    shape.quadraticCurveTo(-0.2, suv ? 1.86 : 1.61, 0.12, suv ? 1.85 : 1.6);
    shape.lineTo(suv ? 1.35 : 0.9, suv ? 1.85 : 1.58);
    shape.quadraticCurveTo(1.45, 1.5, 1.75, 1.06);
    shape.lineTo(2.27, 0.98);
    shape.quadraticCurveTo(2.42, 0.83, 2.4, 0.52);
    shape.lineTo(2.1, 0.35);
    shape.lineTo(-2.1, 0.35);
    shape.closePath();
    return new ExtrudeGeometry(shape, {
      depth: 1.65,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.09,
      curveSegments: 24,
    });
  }, [suv]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const paint = useMemo(() => new Color(color), [color]);
  return (
    <group position={[0, -0.48, 0]}>
      <mesh geometry={geometry} position={[0, 0, -0.825]}>
        <meshPhysicalMaterial
          color={paint}
          metalness={0.86}
          roughness={0.24}
          clearcoat={1}
          transparent
          opacity={interior ? 0.24 : 1}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0.45, suv ? 1.54 : 1.34, side * 0.94]}>
            <boxGeometry args={[1.45, 0.42, 0.025]} />
            <meshPhysicalMaterial color="#14212a" metalness={0.5} roughness={0.14} />
          </mesh>
          <mesh position={[0.3, suv ? 1.55 : 1.35, side * 0.965]}>
            <boxGeometry args={[0.07, 0.45, 0.03]} />
            <meshStandardMaterial color="#111015" />
          </mesh>
          <mesh position={[-0.72, 1.07, side * 1.02]}>
            <boxGeometry args={[0.3, 0.13, 0.18]} />
            <meshStandardMaterial color={paint} metalness={0.8} roughness={0.2} />
          </mesh>
          {[-0.1, 1.1].map((x) => (
            <mesh key={x} position={[x, 0.98, side * 0.965]}>
              <boxGeometry args={[0.2, 0.035, 0.035]} />
              <meshStandardMaterial color="#c5bcc0" metalness={1} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[0.2, 0.4, side * 0.96]}>
            <boxGeometry args={[2.6, 0.09, 0.04]} />
            <meshStandardMaterial color="#171018" />
          </mesh>
          {[-1.45, 1.5].map((x) => (
            <group key={x} position={[x, 0.48, side * 0.94]}>
              <mesh>
                <torusGeometry args={[0.38, 0.13, 16, 48]} />
                <meshStandardMaterial color="#151419" roughness={0.85} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.33, 0.33, 0.25, 32]} />
                <meshStandardMaterial color="#232127" metalness={0.7} roughness={0.3} />
              </mesh>
              {Array.from({ length: 10 }, (_, index) => (
                <mesh
                  key={index}
                  rotation={[0, 0, (index * Math.PI) / 5]}
                  position={[0, 0, side * 0.15]}
                >
                  <boxGeometry args={[0.055, 0.62, 0.025]} />
                  <meshStandardMaterial color="#bdb9b5" metalness={1} roughness={0.2} />
                </mesh>
              ))}
              <mesh position={[0, 0, side * 0.17]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
                <circleGeometry args={[0.095, 24]} />
                <meshStandardMaterial color="#8c727a" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[-0.65, suv ? 1.48 : 1.31, 0]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.04, 0.64, 1.6]} />
        <meshPhysicalMaterial color="#16232c" metalness={0.6} roughness={0.12} />
      </mesh>
      <RoundedBox args={[0.1, 0.36, 1.56]} radius={0.04} position={[-2.4, 0.64, 0]}>
        <meshStandardMaterial color="#130d13" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <group key={side}>
          <RoundedBox args={[0.12, 0.32, 0.37]} radius={0.04} position={[-2.47, 0.7, side * 0.23]}>
            <meshStandardMaterial color="#090c11" metalness={0.8} roughness={0.2} />
          </RoundedBox>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-2.54, 0.7, side * (0.12 + i * 0.1)]}>
              <boxGeometry args={[0.02, 0.27, 0.015]} />
              <meshStandardMaterial color="#c8c4c2" metalness={1} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[-2.43, 0.91, side * 0.68]}>
            <boxGeometry args={[0.1, 0.055, 0.39]} />
            <meshStandardMaterial color="#daefff" emissive="#9bd8ff" emissiveIntensity={2} />
          </mesh>
          <mesh position={[2.42, 0.83, side * 0.63]}>
            <boxGeometry args={[0.06, 0.07, 0.55]} />
            <meshStandardMaterial color="#f03e5c" emissive="#f01c4a" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
      <mesh position={[-2.54, 0.43, 0]}>
        <boxGeometry args={[0.025, 0.13, 0.65]} />
        <meshStandardMaterial color="#ece8e4" />
      </mesh>
      {interior &&
        [-0.45, 0.55].map((x) => (
          <group key={x} position={[x, 0.95, 0]}>
            {[-0.43, 0.43].map((z) => (
              <RoundedBox key={z} args={[0.6, 0.8, 0.55]} radius={0.12} position={[0, 0, z]}>
                <meshStandardMaterial color="#c5a993" roughness={0.85} />
              </RoundedBox>
            ))}
          </group>
        ))}
    </group>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const VehicleScene = memo(function VehicleScene(props: Props) {
  const fallback = <CarArtwork {...props} />;
  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        shadows={false}
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [-6.5, 3.1, 6.4], fov: 36 }}
        fallback={fallback}
        aria-label={`${props.name} interactive concept model`}
      >
        <ambientLight intensity={props.dark ? 0.6 : 1.3} />
        <spotLight position={[-4, 6, 3]} intensity={90} angle={0.7} penumbra={1} />
        <group rotation={[0, props.angle, 0]}>
          {props.bodyType === "xuv" ? (
            <BoxyXuvModel color={props.color} interior={props.interior ?? false} />
          ) : (
            <CarModel {...props} />
          )}
        </group>
        <ContactShadows
          position={[0, -0.49, 0]}
          scale={12}
          opacity={0.55}
          blur={2.5}
          far={4}
          resolution={256}
        />
        <Environment resolution={128}>
          <Lightformer
            intensity={4}
            position={[0, 5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[8, 3, 1]}
          />
          <Lightformer
            intensity={3}
            position={[-5, 2, 1]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[5, 2, 1]}
          />
          <Lightformer color="#d8a5b2" intensity={2} position={[2, 2, -4]} scale={[6, 2, 1]} />
        </Environment>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5}
          maxDistance={11}
          minPolarAngle={0.5}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.3, 0]}
        />
      </Canvas>
    </SceneBoundary>
  );
});

export default VehicleScene;
