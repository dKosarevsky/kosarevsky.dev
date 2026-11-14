import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { UNIVERSES } from '../../src/multiverse/universes.js';
import { createUniverseView, mapPortalCamera } from '../../src/multiverse/portal-view.js';

function camera() {
  const value = new THREE.PerspectiveCamera(36, 1.8, .1, 120);
  value.position.set(.25, .12, 8);
  value.lookAt(.25, .05, 0);
  value.updateMatrixWorld(true);
  return value;
}

function assertVector(actual, expected, tolerance = 1e-9) {
  assert.ok(actual.distanceTo(expected) < tolerance, `${actual.toArray()} differs from ${expected.toArray()}`);
}

function fakeRenderer({ float = true, width = 1800, height = 1000 } = {}) {
  let target = { name: 'previous framebuffer' }, clearColor = new THREE.Color(0x123456), clearAlpha = .4;
  const viewport = new THREE.Vector4(4, 5, 600, 350), scissor = new THREE.Vector4(7, 8, 300, 200);
  let scissorTest = true;
  const calls = [];
  const renderer = {
    autoClear: false,
    extensions: { has(name) { assert.equal(name, 'EXT_color_buffer_float'); return float; } },
    getDrawingBufferSize(value) { return value.set(width, height); },
    getPixelRatio() { return 1.5; },
    getRenderTarget() { return target; },
    setRenderTarget(value) { target = value; },
    getClearColor(value) { return value.copy(clearColor); },
    getClearAlpha() { return clearAlpha; },
    setClearColor(value, alpha) { clearColor.set(value); clearAlpha = alpha; },
    getViewport(value) { return value.copy(viewport); },
    setViewport(...values) { values[0]?.isVector4 ? viewport.copy(values[0]) : viewport.set(...values); },
    getScissor(value) { return value.copy(scissor); },
    setScissor(...values) { values[0]?.isVector4 ? scissor.copy(values[0]) : scissor.set(...values); },
    getScissorTest() { return scissorTest; },
    setScissorTest(value) { scissorTest = value; },
    clear() { calls.push({ kind: 'clear', target }); },
    clearDepth() { calls.push({ kind: 'clearDepth', target }); },
    render(scene, viewCamera) {
      calls.push({ kind: 'render', scene, target, camera: viewCamera.clone(), viewport: viewport.clone() });
      if (renderer.failScene === scene) throw new Error('GPU draw failed');
    },
  };
  return {
    renderer, calls,
    snapshot() { return { target, clearColor: clearColor.getHex(), clearAlpha, viewport: viewport.toArray(), scissor: scissor.toArray(), scissorTest, autoClear: renderer.autoClear }; },
    setSize(w, h) { width = w; height = h; },
    renders() { return calls.filter(call => call.kind === 'render'); },
  };
}

test('portal camera projects the same rays as transformed destination geometry', () => {
  assert.equal(typeof mapPortalCamera, 'function', 'the camera mapping helper must exist');
  const source = camera(), mapped = new THREE.PerspectiveCamera();
  const entrance = new THREE.Matrix4().compose(new THREE.Vector3(.4, -.2, 1.445), new THREE.Quaternion().setFromEuler(new THREE.Euler(.13, -.4, .07)), new THREE.Vector3(1, 1, 1));
  mapPortalCamera(source, entrance.clone().invert(), mapped);
  for (const point of [new THREE.Vector3(-.65, .32, -6.6), new THREE.Vector3(3.5, 1.65, -11)]) {
    assertVector(point.clone().project(mapped), point.clone().applyMatrix4(entrance).project(source));
  }
  assert.deepEqual(mapped.projectionMatrix.elements, source.projectionMatrix.elements);
  assert.deepEqual(mapped.projectionMatrixInverse.elements, source.projectionMatrixInverse.elements);
});

test('a translated portal eye produces stronger parallax for nearby geometry', () => {
  assert.equal(typeof mapPortalCamera, 'function');
  const source = camera(), mapped = new THREE.PerspectiveCamera();
  const near = new THREE.Vector3(0, 0, -2), far = new THREE.Vector3(0, 0, -25);
  mapPortalCamera(source, new THREE.Matrix4(), mapped);
  const beforeNear = near.clone().project(mapped), beforeFar = far.clone().project(mapped);
  mapPortalCamera(source, new THREE.Matrix4().makeTranslation(1, 0, 0), mapped);
  const nearShift = Math.abs(near.clone().project(mapped).x - beforeNear.x);
  const farShift = Math.abs(far.clone().project(mapped).x - beforeFar.x);
  assert.ok(nearShift > farShift * 2, `${nearShift} should exceed twice ${farShift}`);
});

test('both targets preserve viewport aspect, cap resolution, and choose supported color storage', () => {
  assert.equal(typeof createUniverseView, 'function', 'the universe renderer must exist');
  for (const float of [true, false]) {
    const h = fakeRenderer({ float }), view = createUniverseView(h.renderer);
    try {
      view.resize();
      view.update({ camera: camera(), entranceMatrix: new THREE.Matrix4(), time: 0 });
      view.render({ artifactScene: new THREE.Scene(), camera: camera() });
      const targets = h.renders().slice(0, 2).map(call => call.target);
      assertVector(view.outputResolution, new THREE.Vector2(1800, 1000));
      for (const target of targets) {
        assert.ok(Math.max(target.width, target.height) <= 960);
        assert.ok(Math.abs(target.width / target.height - 1.8) < .003);
        assert.equal(target.texture.type, float ? THREE.HalfFloatType : THREE.UnsignedByteType);
        assert.equal(target.texture.colorSpace, THREE.LinearSRGBColorSpace);
        assert.equal(target.depthBuffer, true);
      }
      assert.equal(view.texture, targets[1].texture);
      h.setSize(300, 500); view.resize();
      assert.equal(targets[0].width, 300); assert.equal(targets[0].height, 500);
    } finally { view.dispose(); }
  }
});

test('arrival keeps the preview scene and its camera mapping before advancing the next preview', () => {
  assert.equal(typeof createUniverseView, 'function');
  const h = fakeRenderer(), view = createUniverseView(h.renderer), main = camera(), artifactScene = new THREE.Scene();
  const entrance = new THREE.Matrix4().makeRotationY(-.36).setPosition(0, 0, 1.445);
  try {
    assert.equal(view.currentIndex, 0);
    assert.equal(view.currentPreset, UNIVERSES[0]);
    assert.equal(view.destinationPreset, UNIVERSES[1]);
    view.update({ camera: main, entranceMatrix: entrance, time: 3 });
    view.render({ artifactScene, camera: main });
    const throughWindow = h.renders()[1].camera.matrixWorld.clone();
    view.update({ camera: main, entranceMatrix: entrance, time: 3, travel: 1 });
    view.render({ artifactScene, camera: main, reveal: 1 });
    const preview = h.renders()[5];
    assert.notDeepEqual(preview.camera.matrixWorld.elements, throughWindow.elements, 'entering the world reveals depth beside the artifact');
    assert.equal(view.commit(1), true);
    assert.equal(view.commit(1), false, 'duplicate completion is harmless');
    assert.equal(view.currentIndex, 1);
    assert.equal(view.destinationPreset, UNIVERSES[2]);
    assert.throws(() => view.commit(0), /next|destination/i);
    view.update({ camera: main, entranceMatrix: entrance, time: 3 });
    view.render({ artifactScene, camera: main, reveal: 0 });
    const arrival = h.renders()[8];
    assert.equal(arrival.scene, preview.scene, 'the exact preview scene becomes the environment');
    assert.deepEqual(arrival.camera.matrixWorld.elements, preview.camera.matrixWorld.elements);
    const frozenCamera = arrival.camera.matrixWorld.clone();
    view.update({ camera: main, entranceMatrix: new THREE.Matrix4().makeRotationY(.8), time: 3 });
    view.render({ artifactScene, camera: main });
    assert.deepEqual(h.renders()[12].camera.matrixWorld.elements, frozenCamera.elements, 'rotating the artifact cannot drag the arrived environment');
  } finally { view.dispose(); }
});

test('render order avoids framebuffer feedback and restores renderer state after a draw failure', () => {
  assert.equal(typeof createUniverseView, 'function');
  const h = fakeRenderer(), view = createUniverseView(h.renderer), artifactScene = new THREE.Scene(), main = camera();
  try {
    const original = h.snapshot();
    view.resize(); view.update({ camera: main, entranceMatrix: new THREE.Matrix4(), time: 0 });
    view.render({ artifactScene, camera: main, reveal: .5, center: { x: .4, y: .3 } });
    const draws = h.renders();
    assert.equal(draws.length, 4);
    assert.ok(draws[0].target?.isWebGLRenderTarget);
    assert.ok(draws[1].target?.isWebGLRenderTarget);
    assert.notEqual(draws[0].target, draws[1].target);
    assert.equal(draws[2].target, null);
    assert.equal(draws[3].target, null);
    assert.equal(draws[3].scene, artifactScene);
    assert.equal(h.calls.filter(call => call.kind === 'clearDepth').length, 1);
    assert.deepEqual(h.snapshot(), original);
    h.renderer.failScene = artifactScene;
    assert.throws(() => view.render({ artifactScene, camera: main }), /GPU draw failed/);
    assert.deepEqual(h.snapshot(), original);
  } finally { view.dispose(); }
});

test('dispose frees both targets, the compositor, and persistent world resources once', () => {
  assert.equal(typeof createUniverseView, 'function');
  const h = fakeRenderer(), view = createUniverseView(h.renderer), artifactScene = new THREE.Scene(), main = camera();
  view.resize(); view.update({ camera: main, entranceMatrix: new THREE.Matrix4(), time: 0 });
  const targets = new Set(), resources = new Set();
  for (let index = 1; index <= 3; index++) {
    view.render({ artifactScene, camera: main });
    for (const draw of h.renders()) {
      if (draw.target) targets.add(draw.target);
      if (draw.scene === artifactScene) continue;
      draw.scene.traverse(object => {
        if (object.geometry) resources.add(object.geometry);
        for (const material of [].concat(object.material || [])) resources.add(material);
      });
    }
    view.commit(index % 3);
  }
  const disposalCounts = new Map();
  for (const resource of [...targets, ...resources]) {
    disposalCounts.set(resource, 0);
    resource.addEventListener('dispose', () => disposalCounts.set(resource, disposalCounts.get(resource) + 1));
  }
  view.dispose(); view.dispose();
  assert.equal(targets.size, 2);
  assert.ok(resources.size > 20);
  assert.ok([...disposalCounts.values()].every(count => count === 1));
  const before = h.calls.length;
  view.render({ artifactScene, camera: main });
  assert.equal(h.calls.length, before, 'a disposed view cannot revive GPU draws');
});
