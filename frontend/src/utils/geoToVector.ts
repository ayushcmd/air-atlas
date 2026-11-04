import * as THREE from 'three'

/**
 * Convert geographic coordinates (latitude, longitude) to a 3D position
 * on a sphere of the given radius.
 *
 * Uses the standard geographic→Cartesian conversion:
 *   x = r · cos(lat) · cos(−lon)   (negate lon so east = right)
 *   y = r · sin(lat)
 *   z = r · cos(lat) · sin(−lon)
 */
export function geoToVector3(
  lat: number,
  lon: number,
  radius = 1,
): THREE.Vector3 {
  const phi = lat * (Math.PI / 180)
  const theta = -lon * (Math.PI / 180)
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta),
  )
}

/**
 * Return Euler rotation that orients an object to face outward from
 * the sphere surface at the given lat/lon.
 */
export function geoToEuler(lat: number, lon: number): THREE.Euler {
  const phi = lat * (Math.PI / 180)
  const theta = -lon * (Math.PI / 180)
  return new THREE.Euler(phi, theta, 0, 'YXZ')
}
