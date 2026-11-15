import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUniverse, UNIVERSES } from '../../src/multiverse/universes.js';

test('each destination contains opaque 3D landmarks and geometry at distinct depths', () => {
  const signatures = [];
  for (let index = 0; index < UNIVERSES.length; index++) {
    const world = createUniverse(index);
    try {
      world.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(world.group);
      assert.ok(Number.isFinite(bounds.min.z) && Number.isFinite(bounds.max.z));
      assert.ok(bounds.max.z - bounds.min.z > 30, 'near dust and far stars must occupy real depth');
      const landmarks = [];
      world.group.traverse(object => {
        if (object.isMesh && !object.material.transparent) landmarks.push(object.name);
      });
      assert.ok(landmarks.length > 0, 'a universe must have solid landmarks, not only a background image');
      signatures.push(landmarks.sort().join('|'));
    } finally { world.dispose(); }
  }
  assert.equal(new Set(signatures).size, UNIVERSES.length, 'world geometry must differ as well as color');
});

test('manual redraws at the same paused time cannot advance or drift the universe', () => {
  for (let index = 0; index < UNIVERSES.length; index++) {
    const world = createUniverse(index);
    const matrices = () => {
      const values = [];
      world.group.updateMatrixWorld(true);
      world.group.traverse(object => values.push(...object.matrixWorld.elements));
      return values;
    };
    try {
      world.update(12);
      const paused = matrices();
      world.update(12);
      assert.deepEqual(matrices(), paused);
      world.update(25);
      assert.notDeepEqual(matrices(), paused);
      world.update(12);
      assert.deepEqual(matrices(), paused, 'the seeded view is reproducible');
    } finally { world.dispose(); }
  }
});

test('Ember has an opaque event horizon that occludes a real accretion disc', () => {
  const world = createUniverse(2);
  try {
    const horizon = world.group.getObjectByName('Event horizon');
    const disc = world.group.getObjectByName('Accretion disc');
    assert.ok(horizon?.isMesh, 'the black hole needs solid three-dimensional occlusion');
    assert.equal(horizon.material.transparent, false);
    assert.ok(disc?.isMesh, 'the accretion flow occupies a tilted plane in space');
    assert.ok(disc.geometry.parameters.innerRadius > horizon.scale.x);
    assert.ok(disc.geometry.parameters.outerRadius > disc.geometry.parameters.innerRadius * 2);
    assert.notEqual(disc.rotation.x, 0, 'the disc must have a visible tilted depth profile');
    assert.ok(world.group.getObjectByName('Photon ring')?.isMesh);
  } finally { world.dispose(); }
});

test('cinematic materials freeze and rewind without allocating or leaking GPU resources', () => {
  for (let index = 0; index < UNIVERSES.length; index++) {
    const world = createUniverse(index);
    const resources = new Set(), flows = [];
    let drawCalls = 0;
    world.group.traverse(object => {
      if (object.geometry) { resources.add(object.geometry); drawCalls++; }
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        resources.add(material);
        if (material.uniforms?.uTime) flows.push(material.uniforms.uTime);
      }
    });
    assert.ok(flows.length > 0, `${UNIVERSES[index].name} must have a flowing cinematic landmark`);
    assert.ok(drawCalls <= 48, 'richer worlds must keep a bounded draw-call budget');
    world.update(7.5);
    const paused = flows.map(uniform => uniform.value);
    world.update(19);
    assert.notDeepEqual(flows.map(uniform => uniform.value), paused);
    world.update(7.5);
    assert.deepEqual(flows.map(uniform => uniform.value), paused);
    world.update(Number.NaN);
    assert.ok(flows.every(uniform => Number.isFinite(uniform.value)));
    const disposed = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
    world.dispose();
    world.dispose();
    assert.ok([...disposed.values()].every(count => count === 1), 'shared GPU resources are disposed once');
  }
});
