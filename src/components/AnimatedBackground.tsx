
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

function FloatingSpheres() {
  const group = useRef<THREE.Group>(null);
  const sphereRefs = Array(50).fill(0).map(() => useRef<THREE.Mesh>(null));

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.2;
    }

    sphereRefs.forEach((ref, i) => {
      if (ref.current) {
        const time = clock.getElapsedTime();
        const row = Math.floor(i / 5);
        const offset = (row % 2) * Math.PI / 10;
        
        ref.current.position.y = Math.sin(time * 0.5 + i * 0.1) * 0.5;
        ref.current.position.x = Math.cos(time * 0.3 + i * 0.1 + offset) * 0.2;
        ref.current.scale.setScalar(Math.sin(time + i) * 0.1 + 0.3);
      }
    });
  });

  return (
    <group ref={group}>
      {sphereRefs.map((ref, i) => (
        <Sphere
          key={i}
          ref={ref}
          args={[0.1, 16, 16]}
          position={[
            (i % 5) * 2 - 4,
            Math.floor(i / 5) * 2 - 4,
            0
          ]}
        >
          <meshStandardMaterial
            color="#78FF00"
            transparent
            opacity={0.2}
            emissive="#78FF00"
            emissiveIntensity={0.5}
          />
        </Sphere>
      ))}
    </group>
  );
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 opacity-50">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <FloatingSpheres />
      </Canvas>
    </div>
  );
}
