import { RoundedBox } from "@react-three/drei";

interface Props {
  color: string;
  interior: boolean;
}

/** Independent boxy adventure concept. Render-only; no manufacturer asset or business logic. */
export function BoxyXuvModel({ color, interior }: Props) {
  return (
    <group position={[0, -0.48, 0]}>
      <RoundedBox args={[4.6, 0.75, 1.8]} radius={0.055} position={[0, 0.85, 0]}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.72}
          roughness={0.26}
          clearcoat={1}
          transparent
          opacity={interior ? 0.16 : 1}
        />
      </RoundedBox>
      <RoundedBox args={[2.85, 1.05, 1.76]} radius={0.035} position={[0.5, 1.72, 0]}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.72}
          roughness={0.26}
          clearcoat={1}
          transparent
          opacity={interior ? 0.12 : 1}
        />
      </RoundedBox>
      <RoundedBox args={[1.45, 0.18, 1.82]} radius={0.04} position={[-1.63, 1.24, 0]}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.72}
          roughness={0.25}
          clearcoat={1}
          transparent
          opacity={interior ? 0.2 : 1}
        />
      </RoundedBox>
      <RoundedBox args={[2.98, 0.12, 1.94]} radius={0.03} position={[0.5, 2.28, 0]}>
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.27}
          transparent
          opacity={interior ? 0.15 : 1}
        />
      </RoundedBox>
      <mesh position={[-0.95, 1.77, 0]}>
        <boxGeometry args={[0.035, 0.7, 1.62]} />
        <meshPhysicalMaterial
          color="#183039"
          metalness={0.3}
          roughness={0.16}
          transparent
          opacity={interior ? 0.15 : 0.93}
        />
      </mesh>
      <mesh position={[1.95, 1.76, 0]}>
        <boxGeometry args={[0.035, 0.66, 1.58]} />
        <meshPhysicalMaterial
          color="#183039"
          metalness={0.3}
          roughness={0.16}
          transparent
          opacity={interior ? 0.15 : 0.93}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-0.41, 0.49, 1.38].map((x) => (
            <group key={x}>
              <mesh position={[x, 1.77, side * 0.899]}>
                <boxGeometry args={[0.75, 0.65, 0.035]} />
                <meshPhysicalMaterial
                  color="#152c37"
                  metalness={0.3}
                  roughness={0.15}
                  transparent
                  opacity={interior ? 0.16 : 0.96}
                />
              </mesh>
              <mesh position={[x, 1.42, side * 0.926]}>
                <boxGeometry args={[0.78, 0.025, 0.035]} />
                <meshStandardMaterial color="#b4b2aa" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {[-0.41, 0.5].map((x) => (
            <group key={x}>
              <mesh position={[x + 0.24, 1.23, side * 0.94]}>
                <boxGeometry args={[0.19, 0.045, 0.06]} />
                <meshStandardMaterial color="#151419" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[x + 0.39, 1.02, side * 0.917]}>
                <boxGeometry args={[0.022, 0.74, 0.018]} />
                <meshStandardMaterial color="#220d13" />
              </mesh>
              <mesh position={[x - 0.38, 1.12, side * 0.944]}>
                <boxGeometry args={[0.08, 0.09, 0.04]} />
                <meshStandardMaterial color="#4a2930" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          ))}
          <RoundedBox args={[0.27, 0.2, 0.2]} radius={0.025} position={[-0.91, 1.5, side * 1.04]}>
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
          </RoundedBox>
          <RoundedBox args={[2.28, 0.12, 0.27]} radius={0.03} position={[0, 0.47, side * 1.02]}>
            <meshStandardMaterial color="#29262b" metalness={0.7} roughness={0.3} />
          </RoundedBox>
          <mesh position={[0.5, 2.38, side * 0.77]}>
            <boxGeometry args={[2.72, 0.06, 0.065]} />
            <meshStandardMaterial color="#26232a" metalness={0.7} roughness={0.25} />
          </mesh>
          {[-1.48, 1.48].map((x) => (
            <group key={x}>
              <RoundedBox args={[1.22, 0.18, 0.31]} radius={0.06} position={[x, 1.06, side * 0.93]}>
                <meshStandardMaterial color="#252329" roughness={0.7} />
              </RoundedBox>
              <group position={[x, 0.5, side * 1.01]}>
                <mesh>
                  <torusGeometry args={[0.39, 0.14, 12, 32]} />
                  <meshStandardMaterial color="#17181a" roughness={0.95} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.31, 0.31, 0.27, 24]} />
                  <meshStandardMaterial color="#32343b" metalness={0.8} roughness={0.3} />
                </mesh>
                {[0, 1, 2, 3, 4].map((index) => (
                  <mesh
                    key={index}
                    rotation={[0, 0, (index * Math.PI) / 5]}
                    position={[0, 0, side * 0.15]}
                  >
                    <boxGeometry args={[0.055, 0.57, 0.035]} />
                    <meshStandardMaterial color="#c3bec0" metalness={0.9} roughness={0.23} />
                  </mesh>
                ))}
                <mesh position={[0, 0, side * 0.18]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
                  <circleGeometry args={[0.09, 20]} />
                  <meshStandardMaterial color="#800020" metalness={0.7} roughness={0.25} />
                </mesh>
              </group>
            </group>
          ))}
          <group position={[-2.36, 1.03, side * 0.66]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh>
              <circleGeometry args={[0.17, 32]} />
              <meshStandardMaterial color="#0d1822" metalness={0.7} roughness={0.15} />
            </mesh>
            <mesh position={[0, 0, 0.015]}>
              <torusGeometry args={[0.14, 0.022, 8, 32]} />
              <meshStandardMaterial color="#e0f4ff" emissive="#c5e8ff" emissiveIntensity={2} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.19, 0.04, 0.012]} />
              <meshStandardMaterial color="#dbf1ff" emissive="#b3dfff" emissiveIntensity={1.6} />
            </mesh>
          </group>
          <mesh position={[2.32, 0.8, side * 0.72]}>
            <boxGeometry args={[0.04, 0.13, 0.27]} />
            <meshStandardMaterial color="#e74b65" emissive="#d62c49" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.1, 0.43, 0.84]} radius={0.025} position={[-2.36, 1, 0]}>
        <meshStandardMaterial color="#14131a" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      {[-0.12, 0, 0.12].map((y) => (
        <mesh key={y} position={[-2.42, 1 + y, 0]}>
          <boxGeometry args={[0.02, 0.035, 0.77]} />
          <meshStandardMaterial color="#b9b6b3" metalness={0.95} roughness={0.2} />
        </mesh>
      ))}
      <RoundedBox args={[0.16, 0.22, 1.98]} radius={0.04} position={[-2.38, 0.58, 0]}>
        <meshStandardMaterial color="#242329" metalness={0.6} roughness={0.3} />
      </RoundedBox>
      <mesh position={[-2.48, 0.6, 0]}>
        <boxGeometry args={[0.018, 0.12, 0.64]} />
        <meshStandardMaterial color="#e9e1d8" />
      </mesh>
      <group position={[2.42, 1.26, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <torusGeometry args={[0.37, 0.13, 12, 32]} />
          <meshStandardMaterial color="#1e2023" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <circleGeometry args={[0.34, 32]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.27} />
        </mesh>
        <mesh position={[0, 0, 0.09]}>
          <torusGeometry args={[0.34, 0.015, 6, 32]} />
          <meshStandardMaterial color="#c6bab5" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {interior &&
        [-0.35, 0.85].map((x) => (
          <group key={x} position={[x, 1.24, 0]}>
            {[-0.43, 0.43].map((z) => (
              <RoundedBox key={z} args={[0.55, 0.85, 0.57]} radius={0.1} position={[0, 0, z]}>
                <meshStandardMaterial color="#bf9670" roughness={0.8} />
              </RoundedBox>
            ))}
          </group>
        ))}
    </group>
  );
}
