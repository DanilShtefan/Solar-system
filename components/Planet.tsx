import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetProps {
  name: string;
  distance: number;
  speed: number;
  size: number;
  color: string;
  description: string;
  onSelect: (name: string, description: string) => void;
  isSelected: boolean;
  textureUrl?: string;
  ringTextureUrl?: string;
  clockTimeRef?: React.MutableRefObject<number>;
  isDamaged?: boolean;
}

const planetNames: Record<string, string> = {
  mercury: 'Меркурий', venus: 'Венера', earth: 'Земля', mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон'
};

function Planet({ name, distance, speed, size, color, description, onSelect, isSelected, textureUrl, ringTextureUrl, clockTimeRef, isDamaged }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texture = textureUrl ? useTexture(textureUrl) : null;
  const ringTexture = ringTextureUrl ? useTexture(ringTextureUrl) : null;

  useFrame(() => {
    if (groupRef.current) {
      const t = clockTimeRef ? clockTimeRef.current : 0;
      groupRef.current.position.x = Math.sin(t * speed) * distance;
      groupRef.current.position.z = Math.cos(t * speed) * distance;
    }

    if (meshRef.current && isDamaged) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const pulse = Math.sin(performance.now() * 0.008) * 0.3 + 0.5;
      mat.emissive.setRGB(1, 0.2, 0);
      mat.emissiveIntensity = pulse;
      mat.roughness = 0.95;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh 
        ref={meshRef}
        onClick={() => onSelect(name, description)} 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 64, 64]} />
        {texture ? (
          <meshStandardMaterial 
            map={texture} 
            roughness={isDamaged ? 0.95 : 0.6} 
            metalness={0.1}
            emissive={isSelected ? '#ffffff' : isDamaged ? '#ff2200' : '#000000'} 
            emissiveIntensity={isSelected ? 0.2 : isDamaged ? 0.5 : 0}
          />
        ) : (
          <meshStandardMaterial 
            color={color} 
            roughness={isDamaged ? 0.95 : 0.6} 
            metalness={0.1}
            emissive={isSelected ? color : isDamaged ? '#ff2200' : '#000000'} 
            emissiveIntensity={isSelected ? 0.3 : isDamaged ? 0.5 : 0}
          />
        )}
      </mesh>
      
      {isDamaged && <CraterFireEffect size={size} />}

      {name === 'saturn' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 2.3, 64]} />
          {ringTexture ? (
            <meshBasicMaterial map={ringTexture} transparent opacity={0.8} side={2} />
          ) : (
            <meshBasicMaterial color="#aa8866" transparent opacity={0.6} side={2} />
          )}
        </mesh>
      )}
      <Html position={[size + 1, 0, 0]} center distanceFactor={12}>
        <div style={{ 
          color: isSelected ? '#ffffff' : hovered ? '#ffffff' : '#cccccc', 
          fontSize: isSelected ? '16px' : '14px', 
          fontFamily: 'Arial, sans-serif', 
          fontWeight: 'bold', 
          textShadow: '0 0 8px #000000', 
          pointerEvents: 'none', 
          whiteSpace: 'nowrap', 
          background: 'rgba(0,0,0,0.5)', 
          padding: '2px 6px', 
          borderRadius: '4px' 
        }}>
          {planetNames[name] || name}
        </div>
      </Html>
    </group>
  );
}

function CraterFireEffect({ size }: { size: number }) {
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const sparkPositions = React.useMemo(() => {
    const positions = new Float32Array(50 * 3);
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size * 0.3;
      const height = Math.random() * size * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, [size]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = Math.sin(t * 12) * 0.4 + 0.6;
    const flicker = Math.sin(t * 23) * 0.2 + 0.8;

    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pulse;
    }
    if (outerGlowRef.current) {
      const mat = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pulse * 0.5;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 5 * flicker;
    }
    if (sparksRef.current) {
      const positions = sparksRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 50; i++) {
        const idx = i * 3;
        positions[idx + 1] += 0.02;
        if (positions[idx + 1] > size * 0.5) {
          positions[idx + 1] = 0;
        }
      }
      sparksRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const craterPos: [number, number, number] = [size * 0.5, size * 0.4, size * 0.6];

  return (
    <group position={craterPos}>
      {/* Тёмный кратер */}
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[size * 0.2, 32]} />
        <meshBasicMaterial color="#0a0500" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Внутреннее свечение - огонь */}
      <mesh ref={innerGlowRef} position={[0, 0.01, 0]}>
        <circleGeometry args={[size * 0.18, 32]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Внешнее свечение */}
      <mesh ref={outerGlowRef} position={[0, 0.02, 0]}>
        <circleGeometry args={[size * 0.25, 32]} />
        <meshBasicMaterial 
          color="#ff3300" 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Искры */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={sparkPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={size * 0.08}
          color="#ffaa00"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      
      {/* Свет от огня */}
      <pointLight
        ref={lightRef}
        color="#ff6600"
        intensity={5}
        distance={size * 3}
      />
    </group>
  );
}

export default Planet;