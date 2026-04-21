import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

import Sun from './Sun';
import Planet from './Planet';
import Asteroid from './Asteroid';
import ExplosionEffect from './ExplosionEffect';
import TimeTracker from './TimeTracker';

const planetDistances: Record<string, number> = {
  mercury: 8, venus: 12, earth: 18, mars: 24, jupiter: 35, saturn: 48, uranus: 62, neptune: 75, pluto: 88
};

const planetSpeeds: Record<string, number> = {
  mercury: 0.8, venus: 0.5, earth: 0.3, mars: 0.2, jupiter: 0.1, saturn: 0.07, uranus: 0.05, neptune: 0.04, pluto: 0.03
};

const planetSizes: Record<string, number> = {
  mercury: 0.4, venus: 0.9, earth: 1, mars: 0.5, jupiter: 2.5, saturn: 2.1, uranus: 1.4, neptune: 1.3, pluto: 0.3
};

const planetData: Record<string, { name: string; description: string }> = {
  mercury: { name: 'Меркурий', description: 'Самая маленькая и ближайшая к Солнцу планета. День длится 59 земных суток, год - 88 суток.' },
  venus: { name: 'Венера', description: 'Вторая планета от Солнца. Самая горячая планета из-за парникового эффекта.' },
  earth: { name: 'Земля', description: 'Третья планета от Солнца. Единственная известная планета с жизнью.' },
  mars: { name: 'Марс', description: 'Четвёртая планета. Красная планета из-за оксида железа.' },
  jupiter: { name: 'Юпитер', description: 'Крупнейшая планета Солнечной системы. Газовый гигант.' },
  saturn: { name: 'Сатурн', description: 'Вторая по величине планета. Знаменита своими кольцами.' },
  uranus: { name: 'Уран', description: 'Седьмая планета. Ледяной гигант.' },
  neptune: { name: 'Нептун', description: 'Восьмая планета. Ледяной гигант с самыми сильными ветрами.' },
  pluto: { name: 'Плутон', description: 'Карликовая планета.' }
};

export default function GlobeScene() {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [targetPlanet, setTargetPlanet] = useState<string | null>(null);
  const [asteroidActive, setAsteroidActive] = useState(false);
  const [explosionActive, setExplosionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [damagedPlanets, setDamagedPlanets] = useState<Set<string>>(new Set());
  
  const clockTimeRef = useRef<number>(0);
  const explosionPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const asteroidTargetRef = useRef<{ x: number; z: number } | null>(null);

  const handleSelect = (name: string, description: string) => {
    setSelectedPlanet(selectedPlanet === name ? null : name);
    setTargetPlanet(null);
    setAsteroidActive(false);
    setExplosionActive(false);
  };

  const handleGoTo = (name: string) => {
    setTargetPlanet(name);
    setSelectedPlanet(null);
  };

  const handleLaunchAsteroid = () => {
    if (selectedPlanet && selectedPlanet !== 'pluto') {
      const distance = planetDistances[selectedPlanet];
      const speed = planetSpeeds[selectedPlanet];
      const x = Math.sin(clockTimeRef.current * speed) * distance;
      const z = Math.cos(clockTimeRef.current * speed) * distance;
      asteroidTargetRef.current = { x, z };
      explosionPosRef.current.set(x, 0, z);
      setIsPaused(true);
      setAsteroidActive(true);
      setExplosionActive(false);
    }
  };

  const handleResetAsteroid = () => {
    asteroidTargetRef.current = null;
    setIsPaused(false);
    setAsteroidActive(false);
    setExplosionActive(false);
    clearDamage();
  };

  const handleImpact = () => {
    setAsteroidActive(false);
    setExplosionActive(true);
    if (selectedPlanet) {
      setDamagedPlanets(prev => new Set(prev).add(selectedPlanet));
    }
  };

  const clearDamage = () => {
    setDamagedPlanets(new Set());
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000', overflow: 'hidden', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0 }}>
      <Canvas camera={{ position: [0, 50, 90], fov: 50 }}>
        <TimeTracker timeRef={clockTimeRef} paused={isPaused} />
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0, 0]} intensity={3} distance={200} color="#ffffff" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Sun />
        
        <OrbitLine distance={8} color="#666666" />
        <Planet name="mercury" distance={8} speed={0.8} size={0.4} color="#aaaaaa" description={planetData.mercury.description} onSelect={handleSelect} isSelected={selectedPlanet === 'mercury'} textureUrl="/textures/Mercury/mercury.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('mercury')} />
        
        <OrbitLine distance={12} color="#665533" />
        <Planet name="venus" distance={12} speed={0.5} size={0.9} color="#ddcc88" description={planetData.venus.description} onSelect={handleSelect} isSelected={selectedPlanet === 'venus'} textureUrl="/textures/Venus/venus_surface.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('venus')} />
        
        <OrbitLine distance={18} color="#334466" />
        <Planet name="earth" distance={18} speed={0.3} size={1} color="#2266cc" description={planetData.earth.description} onSelect={handleSelect} isSelected={selectedPlanet === 'earth'} textureUrl="/textures/Earth/earth.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('earth')} />
        
        <OrbitLine distance={24} color="#553322" />
        <Planet name="mars" distance={24} speed={0.2} size={0.5} color="#dd4422" description={planetData.mars.description} onSelect={handleSelect} isSelected={selectedPlanet === 'mars'} textureUrl="/textures/Mars/8k_mars.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('mars')} />
        
        <OrbitLine distance={35} color="#554433" />
        <Planet name="jupiter" distance={35} speed={0.1} size={2.5} color="#ddaa77" description={planetData.jupiter.description} onSelect={handleSelect} isSelected={selectedPlanet === 'jupiter'} textureUrl="/textures/Jupiter/jupiter.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('jupiter')} />
        
        <OrbitLine distance={48} color="#aa9977" />
        <Planet name="saturn" distance={48} speed={0.07} size={2.1} color="#eedd99" description={planetData.saturn.description} onSelect={handleSelect} isSelected={selectedPlanet === 'saturn'} textureUrl="/textures/Saturn/saturn.jpg" ringTextureUrl="/textures/Saturn/saturn_ring_alpha.png" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('saturn')} />
        
        <OrbitLine distance={62} color="#6699cc" />
        <Planet name="uranus" distance={62} speed={0.05} size={1.4} color="#88ddff" description={planetData.uranus.description} onSelect={handleSelect} isSelected={selectedPlanet === 'uranus'} textureUrl="/textures/Uranus/uranus.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('uranus')} />
        
        <OrbitLine distance={75} color="#4466aa" />
        <Planet name="neptune" distance={75} speed={0.04} size={1.3} color="#4466ff" description={planetData.neptune.description} onSelect={handleSelect} isSelected={selectedPlanet === 'neptune'} textureUrl="/textures/Neptune/neptune.jpg" clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('neptune')} />
        
        <OrbitLine distance={88} color="#887766" />
        <Planet name="pluto" distance={88} speed={0.03} size={0.3} color="#ccaa88" description={planetData.pluto.description} onSelect={handleSelect} isSelected={selectedPlanet === 'pluto'} clockTimeRef={clockTimeRef} isDamaged={damagedPlanets.has('pluto')} />
        
        <OrbitController targetPlanet={targetPlanet} />
        
        {asteroidActive && asteroidTargetRef.current && (
          <Asteroid
            targetX={asteroidTargetRef.current.x}
            targetZ={asteroidTargetRef.current.z}
            onImpact={handleImpact}
            active={asteroidActive}
          />
        )}
        
        {explosionActive && (
          <ExplosionEffect
            explosionPosition={explosionPosRef.current}
            planetSize={planetSizes[selectedPlanet || 'earth'] || 1}
            active={explosionActive}
          />
        )}
      </Canvas>
      
      {selectedPlanet && selectedPlanet !== 'pluto' && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(20, 20, 40, 0.9)', border: '1px solid #4488ff', borderRadius: '12px', padding: '20px', color: '#ffffff', fontFamily: 'Arial, sans-serif', maxWidth: '300px', boxShadow: '0 0 20px rgba(68, 136, 255, 0.3)' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#4488ff' }}>{planetData[selectedPlanet].name}</h2>
          <p style={{ margin: '0 0 15px 0', lineHeight: 1.5 }}>{planetData[selectedPlanet].description}</p>
          <button onClick={() => handleGoTo(selectedPlanet)} style={{ background: '#4488ff', border: 'none', borderRadius: '6px', padding: '10px 20px', color: '#ffffff', fontSize: '14px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '8px' }}>
            Перейти к планете
          </button>
          <button onClick={handleLaunchAsteroid} disabled={asteroidActive} style={{ background: asteroidActive ? '#666666' : '#ff4422', border: 'none', borderRadius: '6px', padding: '10px 20px', color: '#ffffff', fontSize: '14px', cursor: asteroidActive ? 'not-allowed' : 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '8px' }}>
            {isPaused ? 'Продолжить' : 'Запустить астероид'}
          </button>
          {isPaused && (
            <button onClick={handleResetAsteroid} style={{ background: '#44aa44', border: 'none', borderRadius: '6px', padding: '10px 20px', color: '#ffffff', fontSize: '14px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
              Сбросить
            </button>
          )}
        </div>
      )}

      {selectedPlanet === 'pluto' && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(20, 20, 40, 0.9)', border: '1px solid #4488ff', borderRadius: '12px', padding: '20px', color: '#ffffff', fontFamily: 'Arial, sans-serif', maxWidth: '300px', boxShadow: '0 0 20px rgba(68, 136, 255, 0.3)' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#4488ff' }}>{planetData.pluto.name}</h2>
          <p style={{ margin: '0 0 15px 0', lineHeight: 1.5 }}>{planetData.pluto.description}</p>
          <button onClick={() => handleGoTo('pluto')} style={{ background: '#4488ff', border: 'none', borderRadius: '6px', padding: '10px 20px', color: '#ffffff', fontSize: '14px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
            Перейти к планете
          </button>
        </div>
      )}

      {targetPlanet && (
        <button onClick={() => setTargetPlanet(null)} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ff6644', border: 'none', borderRadius: '6px', padding: '12px 24px', color: '#ffffff', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 15px rgba(255, 102, 68, 0.5)' }}>
          Вернуться к Солнцу
        </button>
      )}
    </div>
  );
}

function OrbitController({ targetPlanet }: { targetPlanet: string | null }) {
  const controlsRef = useRef<any>(null);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    if (targetPlanet && planetDistances[targetPlanet] !== undefined) {
      const distance = planetDistances[targetPlanet];
      const speed = planetSpeeds[targetPlanet] || 0.3;
      const t = clock.getElapsedTime();
      const x = Math.sin(t * speed) * distance;
      const z = Math.cos(t * speed) * distance;
      targetRef.current.set(x, 0, z);
    } else {
      targetRef.current.set(0, 0, 0);
    }
    if (controlsRef.current) {
      controlsRef.current.target.copy(targetRef.current);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls ref={controlsRef} enableRotate={true} enableZoom={true} minDistance={3} maxDistance={150} />
  );
}

function OrbitLine({ distance, color }: { distance: number; color: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[distance - 0.05, distance + 0.05, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} side={2} />
    </mesh>
  );
}