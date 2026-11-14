import * as THREE from 'three';

const TAU = Math.PI * 2;
const OUTER_RADIUS = 1.65;
const INNER_RADIUS = 1.39;
const FRONT_CUT = 0.49;
const BACK_CUT = Math.PI - 0.28;
const SECTOR_COUNT = 8;

function spherical(radius, theta, phi) {
  const ring = radius * Math.sin(theta);
  return new THREE.Vector3(ring * Math.cos(phi), ring * Math.sin(phi), radius * Math.cos(theta));
}

/** A closed spherical shell with a genuine rounded bevel, including its bore. */
function shellGeometry({ theta0, theta1, phi0, phi1, outer, inner, bevel = 0.043, rows = 56, columns = 16, polishedBevel = false }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const vertices = new Map();

  function vertex(u, v, radius, inset) {
    const theta = THREE.MathUtils.lerp(theta0 + inset / radius, theta1 - inset / radius, u);
    const phiInset = inset / (radius * Math.max(0.25, Math.sin(theta)));
    const phi = THREE.MathUtils.lerp(phi0 + phiInset, phi1 - phiInset, v);
    const point = spherical(radius, theta, phi);
    const key = `${point.x.toFixed(7)},${point.y.toFixed(7)},${point.z.toFixed(7)}`;
    if (vertices.has(key)) return vertices.get(key);
    const index = positions.length / 3;
    positions.push(point.x, point.y, point.z);
    uvs.push(phi / TAU, theta / Math.PI);
    vertices.set(key, index);
    return index;
  }

  function face(a, b, c, reverse = false) {
    if (reverse) indices.push(a, c, b);
    else indices.push(a, b, c);
  }

  function surface(radius, reverse) {
    const grid = [];
    for (let u = 0; u <= rows; u += 1) {
      const row = [];
      for (let v = 0; v <= columns; v += 1) row.push(vertex(u / rows, v / columns, radius, bevel));
      grid.push(row);
    }
    for (let u = 0; u < rows; u += 1) {
      for (let v = 0; v < columns; v += 1) {
        const a = grid[u][v];
        const b = grid[u + 1][v];
        const c = grid[u + 1][v + 1];
        const d = grid[u][v + 1];
        face(a, b, d, reverse);
        face(b, c, d, reverse);
      }
    }
  }

  function perimeter(radius, inset) {
    const ring = [];
    for (let j = 0; j < columns; j += 1) ring.push(vertex(0, j / columns, radius, inset));
    for (let j = 0; j < rows; j += 1) ring.push(vertex(j / rows, 1, radius, inset));
    for (let j = columns; j > 0; j -= 1) ring.push(vertex(1, j / columns, radius, inset));
    for (let j = rows; j > 0; j -= 1) ring.push(vertex(j / rows, 0, radius, inset));
    return ring;
  }

  surface(outer, false);
  surface(inner, true);
  const surfaceIndexCount = indices.length;
  const rings = [];
  const bevelSteps = 5;
  for (let step = 0; step <= bevelSteps; step += 1) {
    const angle = (step / bevelSteps) * Math.PI / 2;
    rings.push(perimeter(outer - bevel * (1 - Math.cos(angle)), bevel * (1 - Math.sin(angle))));
  }
  for (let step = bevelSteps; step >= 0; step -= 1) {
    const angle = (step / bevelSteps) * Math.PI / 2;
    rings.push(perimeter(inner + bevel * (1 - Math.cos(angle)), bevel * (1 - Math.sin(angle))));
  }
  for (let layer = 0; layer < rings.length - 1; layer += 1) {
    for (let j = 0; j < rings[layer].length; j += 1) {
      const next = (j + 1) % rings[layer].length;
      face(rings[layer][j], rings[layer + 1][j], rings[layer][next], true);
      face(rings[layer + 1][j], rings[layer + 1][next], rings[layer][next], true);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  if (polishedBevel) {
    geometry.addGroup(0, surfaceIndexCount, 0);
    geometry.addGroup(surfaceIndexCount, indices.length - surfaceIndexCount, 1);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** A narrow, curved surface strip. It follows the shell rather than floating over it. */
function surfaceStrip(radius, theta0, theta1, phi0, phi1, rows = 48, columns = 1) {
  const positions = [];
  const indices = [];
  for (let u = 0; u <= rows; u += 1) {
    const theta = THREE.MathUtils.lerp(theta0, theta1, u / rows);
    for (let v = 0; v <= columns; v += 1) {
      const phi = THREE.MathUtils.lerp(phi0, phi1, v / columns);
      const point = spherical(radius, theta, phi);
      positions.push(point.x, point.y, point.z);
    }
  }
  for (let u = 0; u < rows; u += 1) {
    for (let v = 0; v < columns; v += 1) {
      const a = u * (columns + 1) + v;
      const b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function metalGrain() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  let seed = 71363;
  for (let pixel = 0; pixel < size * size; pixel += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const shade = 190 + (seed >>> 26);
    data.set([shade, shade, shade, 255], pixel * 4);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(22, 8);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Eight machined shell fragments and a recessed, independently clickable core.
 * The artifact's forward axis is +Z; its body radius is 1.65 scene units.
 */
export function createArtifact() {
  const group = new THREE.Group();
  group.name = 'Multiverse node';
  const segments = [];
  const disposables = new Set();
  const glowMaterials = [];
  const grain = metalGrain();
  disposables.add(grain);

  const register = (resource) => { disposables.add(resource); return resource; };
  const shellMaterial = register(new THREE.MeshPhysicalMaterial({
    color: 0x0c1315,
    metalness: 0.93,
    roughness: 0.32,
    roughnessMap: grain,
    bumpMap: grain,
    bumpScale: 0.0012,
    clearcoat: 0.17,
    clearcoatRoughness: 0.26,
    envMapIntensity: 0.42,
  }));
  // Only the rounded cut surfaces catch a bright reflection; the broad panels stay dark.
  const bevelMaterial = register(new THREE.MeshPhysicalMaterial({ color: 0x83928b, metalness: 0.96, roughness: 0.2, envMapIntensity: 0.75, clearcoat: 0.24, clearcoatRoughness: 0.16 }));
  const insetMaterial = register(new THREE.MeshStandardMaterial({ color: 0x060d10, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.35 }));
  const hardwareMaterial = register(new THREE.MeshStandardMaterial({ color: 0x485558, metalness: 0.94, roughness: 0.23, envMapIntensity: 0.65 }));
  const linerMaterial = register(new THREE.MeshStandardMaterial({ color: 0x0b1418, metalness: 0.9, roughness: 0.34, envMapIntensity: 0.4 }));
  const coolMaterial = register(new THREE.MeshStandardMaterial({ color: 0x154651, emissive: 0x117b91, emissiveIntensity: 0.52, metalness: 0.3, roughness: 0.35 }));

  function add(parent, geometry, material, index) {
    const mesh = new THREE.Mesh(register(geometry), material);
    if (index !== undefined) mesh.userData.index = index;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  for (let index = 0; index < SECTOR_COUNT; index += 1) {
    const center = (index / SECTOR_COUNT) * TAU + Math.PI / 8;
    const halfWidth = Math.PI / SECTOR_COUNT - 0.018;
    const phi0 = center - halfWidth;
    const phi1 = center + halfWidth;
    const material = register(shellMaterial.clone());
    material.color.offsetHSL(0, 0, index % 3 === 0 ? 0.002 : -0.001);
    const shell = add(group, shellGeometry({ theta0: FRONT_CUT, theta1: BACK_CUT, phi0, phi1, outer: OUTER_RADIUS, inner: INNER_RADIUS, polishedBevel: true }), [material, bevelMaterial], index);
    shell.name = `Shell fragment ${index + 1}`;
    shell.userData.direction = new THREE.Vector3(Math.cos(center), Math.sin(center), 0.26).normalize();
    shell.userData.lift = 0;
    segments.push(shell);

    const glow = register(new THREE.MeshStandardMaterial({ color: 0xa4bd37, emissive: 0xc7ff43, emissiveIntensity: 1.5, metalness: 0.3, roughness: 0.36 }));
    glowMaterials.push(glow);

    // A sliver below each cut edge gives the gap a visible physical depth.
    add(shell, surfaceStrip(1.555, FRONT_CUT + 0.025, BACK_CUT - 0.085, phi0 + 0.001, phi0 + 0.007), glow, index);
    add(shell, surfaceStrip(1.555, FRONT_CUT + 0.025, BACK_CUT - 0.085, phi1 - 0.007, phi1 - 0.001), glow, index);
    // The eight front lip accents read as one broken, machined aperture.
    add(shell, surfaceStrip(1.653, FRONT_CUT + 0.075, FRONT_CUT + 0.084, phi0 + 0.073, phi1 - 0.073, 2, 24), glow, index);
    add(shell, surfaceStrip(1.657, FRONT_CUT + 0.115, FRONT_CUT + 0.123, phi0 + 0.094, phi1 - 0.094, 2, 24), insetMaterial, index);

    // A small service recess breaks up the broad surface without a tiled look.
    const serviceTheta = 1.02 + (index % 2) * 0.18;
    add(shell, shellGeometry({ theta0: serviceTheta, theta1: serviceTheta + 0.27, phi0: center - 0.13, phi1: center + 0.13, outer: 1.662, inner: 1.641, bevel: 0.008, rows: 12, columns: 12 }), insetMaterial, index);
    for (let slot = 0; slot < 3; slot += 1) {
      const theta = serviceTheta + 0.073 + slot * 0.045;
      add(shell, surfaceStrip(1.667, theta, theta + 0.008, center - 0.078, center + 0.078, 1, 8), slot === 0 ? coolMaterial : hardwareMaterial, index);
    }
    // Three restrained status marks, tangent to the sphere, beside the aperture.
    for (let mark = 0; mark < 3; mark += 1) {
      const phi = center - 0.043 + mark * 0.043;
      add(shell, surfaceStrip(1.656, 0.73, 0.755, phi, phi + 0.009, 2, 1), mark === index % 3 ? glow : hardwareMaterial, index);
    }
    // Exposed inner machining is visible when a fragment lifts or the object turns.
    add(shell, surfaceStrip(1.383, FRONT_CUT + 0.075, FRONT_CUT + 0.13, phi0 + 0.07, phi1 - 0.07, 3, 24), coolMaterial, index).material.side = THREE.DoubleSide;
  }

  // A compact internal gimbal: solid structure is only visible through the seams.
  const gimbal = new THREE.Group();
  gimbal.name = 'Inner gimbal';
  for (let axis = 0; axis < 3; axis += 1) {
    const ring = add(gimbal, new THREE.TorusGeometry(1.26, 0.026, 8, 112), linerMaterial);
    if (axis === 1) ring.rotation.x = Math.PI / 2;
    if (axis === 2) ring.rotation.y = Math.PI / 2;
  }
  group.add(gimbal);

  const coreMaterial = register(new THREE.MeshPhysicalMaterial({
    color: 0x010303,
    metalness: 0.58,
    roughness: 0.16,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.38,
  }));
  const core = add(group, new THREE.SphereGeometry(0.54, 64, 40), coreMaterial);
  core.position.z = 0.68;
  core.name = 'Core aperture';
  core.userData.core = true;

  const collar = add(group, new THREE.TorusGeometry(0.628, 0.035, 16, 128), hardwareMaterial);
  collar.position.z = 1.225;
  const collarGroove = add(group, new THREE.TorusGeometry(0.63, 0.008, 8, 128), insetMaterial);
  collarGroove.position.z = 1.261;
  const coreGlowMaterial = register(new THREE.MeshStandardMaterial({ color: 0x8baf2b, emissive: 0xc1ff3d, emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.2 }));
  const innerRing = add(group, new THREE.TorusGeometry(0.594, 0.006, 8, 128), coreGlowMaterial);
  innerRing.position.z = 1.244;
  innerRing.name = 'Core activation rim';

  let lastTime;
  let openingState = 0;
  let disposed = false;

  function update({ time = 0, hover = -1, opening = 0, motion = true } = {}) {
    if (disposed) return;
    const delta = lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(time - lastTime, 0, 0.06);
    lastTime = time;
    const blend = motion ? 1 - Math.exp(-delta * 9) : 1;
    const clampedOpening = THREE.MathUtils.clamp(opening, 0, 1);
    openingState = THREE.MathUtils.lerp(openingState, clampedOpening, blend);
    const hoveredIndex = typeof hover === 'number' ? hover : hover?.userData?.index ?? -1;
    const coreHovered = hover === 'core' || hover?.userData?.core === true;
    for (let index = 0; index < segments.length; index += 1) {
      const panel = segments[index];
      const selected = index === hoveredIndex;
      const lift = openingState * 0.235 + (selected ? 0.055 : 0);
      panel.userData.lift = THREE.MathUtils.lerp(panel.userData.lift, lift, blend);
      panel.position.copy(panel.userData.direction).multiplyScalar(panel.userData.lift);
      const pulse = motion ? Math.sin(time * 1.2 + index * 0.6) * 0.06 : 0;
      glowMaterials[index].emissiveIntensity = 1.35 + (selected ? 1.6 : 0) + openingState * 0.7 + pulse;
    }
    coreGlowMaterial.emissiveIntensity = 1.65 + openingState * 1.2 + (coreHovered ? 1.1 : 0);
    innerRing.scale.setScalar(1 + openingState * 0.015);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const resource of disposables) resource.dispose();
    group.clear();
  }

  update({ motion: false });
  return { group, segments, core, update, dispose };
}
