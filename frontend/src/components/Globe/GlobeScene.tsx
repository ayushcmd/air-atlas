import { OrbitControls, Stars } from '@react-three/drei'
import { EarthMesh } from './EarthMesh'
import { Atmosphere } from './Atmosphere'
import { DataPoints } from './DataPoints'

/**
 * Composes the 3D globe scene: lighting, earth, atmosphere, data overlays.
 * This component lives inside the R3F Canvas.
 */
export function GlobeScene() {
  return (
    <>
      {/* ── Lighting ──────────────────────────────────────────────── */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-5, -2, -3]} intensity={0.5} />
      <hemisphereLight args={['#b1e1ff', '#000000', 0.3]} />

      {/* ── Star field background ─────────────────────────────────── */}
      <Stars
        radius={80}
        depth={60}
        count={3000}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* ── Globe ─────────────────────────────────────────────────── */}
      <EarthMesh />
      <Atmosphere />

      {/* ── Data points (cities) ──────────────────────────────────── */}
      <DataPoints />

      {/* ── Controls ──────────────────────────────────────────────── */}
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enablePan={false}
        minDistance={1.4}
        maxDistance={4}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}
