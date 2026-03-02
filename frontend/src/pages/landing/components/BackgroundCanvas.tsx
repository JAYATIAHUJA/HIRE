import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vertexShader from '../shaders/background.vert';
import fragmentShader from '../shaders/background.frag';

const ShaderPlane = () => {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size]
  );

  useEffect(() => {
    if (material.current) {
      material.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  }, [size]);

  useFrame((state) => {
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime * 0.2; // very slow animation
      
      // Calculate normalized mouse (-1 to 1) 
      // Lerping to create highly minimal tracking with slow decay (High-end feel)
      material.current.uniforms.uMouse.value.lerp(
        new THREE.Vector2(state.pointer.x, state.pointer.y),
        0.02
      );
    }
  });

  return (
    <mesh>
      {/* Plane mapped perfectly to screen dimensions */}
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
};

export default function BackgroundCanvas() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#0B0F1A]">
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 2]} // Optimal performance, restricts density to maintain 60fps
        gl={{ powerPreference: 'high-performance', antialias: false }} // Soften edges intentionally
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}