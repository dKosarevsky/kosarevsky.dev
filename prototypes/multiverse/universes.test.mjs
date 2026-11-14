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
