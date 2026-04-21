import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface TimeTrackerProps {
  timeRef: React.MutableRefObject<number>;
  paused: boolean;
}

export default function TimeTracker({ timeRef, paused }: TimeTrackerProps) {
  const totalWorkRef = useRef(0);
  const lastTimeRef = useRef(0);
  const wasPausedRef = useRef(false);

  useFrame(({ clock }) => {
    const current = clock.getElapsedTime();
    const delta = current - lastTimeRef.current;
    lastTimeRef.current = current;
    
    if (!wasPausedRef.current && paused) {
      wasPausedRef.current = true;
    } else if (wasPausedRef.current && !paused) {
      wasPausedRef.current = false;
    }
    
    if (!paused) {
      totalWorkRef.current += delta;
    }
    
    timeRef.current = totalWorkRef.current;
  });
  
  return null;
}