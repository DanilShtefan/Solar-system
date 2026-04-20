import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidProps {
  targetPlanet: string;
  targetDistance: number;
  onImpact: () => void;
  active: boolean;
  pauseTimeRef: React.MutableRefObject<number>;
  targetSpeed: number;
}

export default function Asteroid({ targetPlanet, targetDistance, onImpact, active, pauseTimeRef, targetSpeed }: AsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!active || !meshRef.current) return;

    const t = clock.getElapsedTime();
    const frozenT = pauseTimeRef.current;
    const targetX = Math.sin(frozenT * targetSpeed) * targetDistance;
    const targetZ = Math.cos(frozenT * targetSpeed) * targetDistance;

    const elapsed = t - frozenT;
    const progress = Math.min(elapsed * 0.5, 1);
    
    const startX = 0;
    const startZ = 90;
    
    meshRef.current.position.x = startX + (targetX - startX) * progress;
    meshRef.current.position.z = startZ + (targetZ - startZ) * progress;
    meshRef.current.rotation.x += delta * 3;
    meshRef.current.rotation.y += delta * 2;

    const distanceToTarget = Math.sqrt(
      Math.pow(meshRef.current.position.x - targetX, 2) +
      Math.pow(meshRef.current.position.z - targetZ, 2)
    );

    if (distanceToTarget < 1) {
      onImpact();
    }
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 90]}>
      <dodecahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial color="#888888" roughness={0.9} metalness={0.3} />
    </mesh>
  );
}