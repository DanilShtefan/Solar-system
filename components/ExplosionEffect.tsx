import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionEffectProps {
  planetDistance: number;
  planetSize: number;
  active: boolean;
}

export default function ExplosionEffect({ planetDistance, planetSize, active }: ExplosionEffectProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!active || !ringRef.current) return;

    const t = clock.getElapsedTime();
    if (startTime.current === 0) {
      startTime.current = t;
      setScale(0);
      setOpacity(1);
    }

    const elapsed = t - startTime.current;
    const newScale = elapsed * 15;
    const newOpacity = Math.max(0, 1 - elapsed * 0.8);

    setScale(newScale);
    setOpacity(newOpacity);

    ringRef.current.scale.set(newScale, newScale, newScale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = newOpacity;
  });

  if (!active) return null;

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, planetDistance]}>
      <ringGeometry args={[planetSize * 0.9, planetSize * 1.1, 32]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}