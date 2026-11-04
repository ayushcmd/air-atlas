import { useRef } from 'react'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'

/**
 * Custom atmosphere glow shader — Fresnel-based rim glow
 * that simulates the scattering haze visible around Earth from space.
 */
const AtmosphereMaterial = shaderMaterial(
  { glowColor: new THREE.Color(0x4da6ff), power: 3.5, opacity: 0.6 },
  /* vertex shader */
  `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  /* fragment shader */
  `
    uniform vec3 glowColor;
    uniform float power;
    uniform float opacity;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
      float intensity = pow(rim, power);
      gl_FragColor = vec4(glowColor, intensity * opacity);
    }
  `,
)

extend({ AtmosphereMaterial })

// Augment ThreeElements so R3F recognises the custom material
declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      glowColor?: THREE.Color
      power?: number
      opacity?: number
      transparent?: boolean
      side?: THREE.Side
      depthWrite?: boolean
    }
  }
}

/**
 * Atmosphere glow shell rendered as a transparent sphere slightly
 * larger than the earth, using a Fresnel rim-light shader.
 */
export function Atmosphere() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += 0.005 * delta
    }
  })

  return (
    <mesh ref={ref} scale={1.015}>
      <sphereGeometry args={[1, 64, 64]} />
      <atmosphereMaterial
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
