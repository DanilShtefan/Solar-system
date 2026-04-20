import React, { useState } from 'react';

function Sun() {
  const [texture, setTexture] = useState<any>(null);

  return (
    <group position={[0, 0, 0]}>
      <mesh>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.15} side={2} />
      </mesh>
      <pointLight intensity={3} color="#ffffff" distance={200} decay={0.5} />
    </group>
  );
}

export default Sun;