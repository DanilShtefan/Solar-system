import { useFrame } from '@react-three/fiber';

interface TimeTrackerProps {
  timeRef: React.MutableRefObject<number>;
}

export default function TimeTracker({ timeRef }: TimeTrackerProps) {
  useFrame(({ clock }) => {
    timeRef.current = clock.getElapsedTime();
  });
  return null;
}