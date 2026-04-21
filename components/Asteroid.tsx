import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidProps {
  targetX: number;
  targetZ: number;
  onImpact: () => void;
  active: boolean;
}

export default function Asteroid({ targetX, targetZ, onImpact, active }: AsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef(0);

  const trailLength = 30;
  const trailPositions = useMemo(() => {
    const positions = new Float32Array(trailLength * 3);
    for (let i = 0; i < trailLength; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 90;
    }
    return positions;
  }, []);

  const positionHistory = useRef<THREE.Vector3[]>([]);

  useFrame(({ clock }, delta) => {
    if (!active || !meshRef.current) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = clock.getElapsedTime();
    }

    const elapsed = clock.getElapsedTime() - startTimeRef.current;
    const progress = Math.min(elapsed * 0.5, 1);
    
    const startX = 0;
    const startZ = 90;
    
    const currentX = startX + (targetX - startX) * progress;
    const currentZ = startZ + (targetZ - startZ) * progress;
    
    meshRef.current.position.x = currentX;
    meshRef.current.position.z = currentZ;
    meshRef.current.rotation.x += delta * 3;
    meshRef.current.rotation.y += delta * 2;

    positionHistory.current.unshift(new THREE.Vector3(currentX, 0, currentZ));
    if (positionHistory.current.length > trailLength) {
      positionHistory.current.pop();
    }

    if (trailRef.current) {
      const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positionHistory.current.length; i++) {
        positions[i * 3] = positionHistory.current[i].x;
        positions[i * 3 + 1] = positionHistory.current[i].y;
        positions[i * 3 + 2] = positionHistory.current[i].z;
      }
      trailRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
      glowRef.current.rotation.x = meshRef.current.rotation.x;
      glowRef.current.rotation.y = meshRef.current.rotation.y;
    }

    const distanceToTarget = Math.sqrt(
      Math.pow(currentX - targetX, 2) +
      Math.pow(currentZ - targetZ, 2)
    );

    if (distanceToTarget < 1) {
      startTimeRef.current = 0;
      onImpact();
    }
  });

  if (!active) return null;

  return (
    <>
      <group>
        <points ref={trailRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailLength}
              array={trailPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.8}
            color="#ff6633"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        <mesh ref={glowRef} position={[0, 0, 90]}>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshBasicMaterial
            color="#ff4400"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>

        <mesh ref={meshRef} position={[0, 0, 90]}>
          <dodecahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial
            color="#888888"
            roughness={0.9}
            metalness={0.3}
            emissive="#ff3300"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </>
  );
}