import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPortal, disposeTree } from '../../src/multiverse/space.js';

function hitsAt(portal, x, y) {
  portal.group.updateMatrixWorld(true);
  const point = portal.mesh.localToWorld(new THREE.Vector3(x, y, 0));
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(portal.mesh.matrixWorld);
  const ray = new THREE.Raycaster(point.clone().addScaledVector(normal, 3), normal.negate());
  return ray.intersectObject(portal.mesh);
}

test('the visible portal aperture accepts a core click', () => {
  const portal = createPortal({ radius: .59 });
  assert.ok(hitsAt(portal, .3, .1).length > 0);
  disposeTree(portal.group);
});

test('transparent glow around the aperture does not intercept shell clicks', () => {
  const portal = createPortal({ radius: .59 });
  assert.equal(hitsAt(portal, .75, .1).length, 0);
  assert.equal(hitsAt(portal, .5, .5).length, 0);
  disposeTree(portal.group);
});

test('the circular click boundary follows the rotated and translated artifact', () => {
  const portal = createPortal({ radius: .59 });
  portal.group.rotation.set(.25, -.7, .2);
  portal.group.position.set(1, .4, -2);
  assert.ok(hitsAt(portal, -.4, .2).length > 0);
  assert.equal(hitsAt(portal, -.65, .3).length, 0);
  disposeTree(portal.group);
});

test('portal optical controls accept finite bounded energy and reset invalid frames', () => {
  const portal = createPortal({ radius: .59 });
  try {
    portal.update(5, 1.6, .7);
    const uniforms = portal.mesh.material.uniforms;
    assert.equal(uniforms.uTime.value, 5);
    assert.equal(uniforms.uPower.value, 1.6);
    assert.equal(uniforms.uTransfer.value, .7);
    portal.update(NaN, Infinity, -4);
    assert.equal(uniforms.uTime.value, 0);
    assert.equal(uniforms.uPower.value, 0);
    assert.equal(uniforms.uTransfer.value, 0);
    portal.update(6, 9, 9);
    assert.equal(uniforms.uPower.value, 2);
    assert.equal(uniforms.uTransfer.value, 1);
  } finally { disposeTree(portal.group); }
});
