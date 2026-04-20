import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface PlanetProps {
  name: string;
  distance: number;
  speed: number;
  size: number;
  color: string;
  description: string;
  onSelect: (name: string, description: string) => void;
  isSelected: boolean;
}

const planetNames: Record<string, string> = {
  mercury: 'Меркурий', venus: 'Венера', earth: 'Земля', mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон'
};

function Planet({ name, distance, speed, size, color, description, onSelect, isSelected }: PlanetProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.x = Math.sin(t * speed) * distance;
      groupRef.current.position.z = Math.cos(t * speed) * distance;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh onClick={() => onSelect(name, description)} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} emissive={isSelected ? color : hovered ? '#222222' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      {name === 'saturn' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 2.3, 64]} />
          <meshBasicMaterial color="#aa8866" transparent opacity={0.6} side={2} />
        </mesh>
      )}
      <Html position={[size + 1, 0, 0]} center distanceFactor={12}>
        <div style={{ color: isSelected ? '#ffffff' : hovered ? '#ffffff' : '#cccccc', fontSize: isSelected ? '16px' : '14px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', textShadow: '0 0 8px #000000', pointerEvents: 'none', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
          {planetNames[name] || name}
        </div>
      </Html>
    </group>
  );
}

export default Planet;