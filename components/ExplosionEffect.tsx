import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionEffectProps {
  explosionPosition: THREE.Vector3;
  planetSize: number;
  active: boolean;
}

export default function ExplosionEffect({ explosionPosition, planetSize, active }: ExplosionEffectProps) {
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const flashRef = useRef<THREE.PointLight>(null);
  const startTime = useRef(0);

  const particleCount = 200;
  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 8;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.3; colors[i * 3 + 2] = 0;
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.6; colors[i * 3 + 2] = 0.1;
      } else if (colorChoice < 0.9) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.3;
      } else {
        colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.9;
      }

      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    return { positions, velocities, colors, sizes };
  }, []);

  useFrame(({ clock }) => {
    if (!active) return;

    const t = clock.getElapsedTime();
    if (startTime.current === 0) {
      startTime.current = t;
    }

    const elapsed = t - startTime.current;
    const duration = 3;

    if (elapsed < duration) {
      if (shockwaveRef.current) {
        const progress = elapsed / 1.5;
        const scale = planetSize * (0.8 + progress * 3);
        shockwaveRef.current.scale.set(scale, scale, scale);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress * 0.8);
      }

      if (innerRingRef.current) {
        const progress = elapsed / 1.2;
        const scale = planetSize * (0.5 + progress * 1.5);
        innerRingRef.current.scale.set(scale, scale, scale);
        (innerRingRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
      }

      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const vx = particleData.velocities[i * 3];
          const vy = particleData.velocities[i * 3 + 1];
          const vz = particleData.velocities[i * 3 + 2];

          positions[i * 3] += vx * 0.016 * Math.min(elapsed * 2, 1);
          positions[i * 3 + 1] += vy * 0.016 * Math.min(elapsed * 2, 1);
          positions[i * 3 + 2] += vz * 0.016 * Math.min(elapsed * 2, 1);

          particleData.velocities[i * 3] *= 0.98;
          particleData.velocities[i * 3 + 1] *= 0.98;
          particleData.velocities[i * 3 + 2] *= 0.98;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (flashRef.current) {
        const flashProgress = elapsed / 0.15;
        flashRef.current.intensity = flashProgress < 1 ? 50 * (1 - flashProgress) : Math.max(0, 10 - elapsed * 5);
      }
    }
  });

  if (!active) return null;

  return (
    <group position={[explosionPosition.x, explosionPosition.y, explosionPosition.z]}>
      <pointLight
        ref={flashRef}
        position={[0, 0, 0]}
        color="#ffaa00"
        intensity={50}
        distance={20}
      />

      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.9, 1.0, 64]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 64]} />
        <meshBasicMaterial
          color="#ffdd44"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={particleData.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <mesh>
        <sphereGeometry args={[planetSize * 0.3, 16, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}