import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GlobeScene } from './GlobeScene'

/**
 * Top-level wrapper that mounts the R3F Canvas and
 * provides a Suspense boundary for texture loading.
 */
export function GlobeContainer() {
  return (
    <div className="w-full h-full" data-testid="globe-container">
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#0a0a1a' }}
      >
        <Suspense fallback={null}>
          <GlobeScene />
        </Suspense>
      </Canvas>
    </div>
  )
}
