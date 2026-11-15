import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createArtifact } from './artifact.js';
import { createTransit, createGesture } from './state.js';
import { createSpace, createPortal, disposeTree } from './space.js';
import { createUniverseView } from './portal-view.js';
import { UNIVERSES } from './universes.js';
import { createFluxField, sampleCinematics } from './cinematics.js';

const clamp = THREE.MathUtils.clamp;
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const BASE_X = .13, BASE_Y = -.24;

export function createNode({ canvas, motion = true, onReady, onStatus, onFrame, onError }) {
  if (typeof ResizeObserver !== 'function' || typeof IntersectionObserver !== 'function') {
    throw new Error('This artwork needs resize and visibility observers.');
  }
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment;
  try {
    environment = pmrem.fromScene(environmentScene, .05);
    scene.environment = environment.texture;
  } catch (error) {
    renderer.dispose();
    throw error;
  } finally {
    environmentScene.dispose();
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xcde7dc, 0x08110e, .58));
  const key = new THREE.DirectionalLight(0xf0fff5, 3.3);
  key.position.set(-3, 5, 5);
  const rim = new THREE.DirectionalLight(0xa4d9f1, 5.2);
  rim.position.set(4, 1, -2);
  const bounce = new THREE.PointLight(0xc8ff64, 2.4, 6, 2);
  bounce.position.set(0, .1, 2.1);
  scene.add(key, rim, bounce);

  const artifact = createArtifact();
  artifact.group.rotation.set(BASE_X, BASE_Y, 0);
  const space = createSpace({ includeStars: false });
  const flux = createFluxField();
  scene.add(space.group, flux.group, artifact.group);
  const entry = createPortal({ radius: .59 });
  entry.group.position.set(0, 0, 1.445);
  entry.mesh.userData.core = true;
  artifact.group.add(entry.group);
  const exit = createPortal({ radius: .4, color: 0x96d3ed });
  exit.group.position.set(2.12, .57, .65);
  exit.group.rotation.y = -.22;
  scene.add(exit.group);
  const exitRim = new THREE.Mesh(new THREE.TorusGeometry(.405, .015, 8, 80), new THREE.MeshStandardMaterial({ color: 0x355057, metalness: .9, roughness: .22, emissive: 0x155b6a, emissiveIntensity: .6, envMapIntensity: .55 }));
  exit.group.add(exitRim);
  const exitEdge = new THREE.Mesh(new THREE.TorusGeometry(.444, .004, 6, 80), new THREE.MeshBasicMaterial({ color: 0x6ec9d7, transparent: true, opacity: .3 }));
  exitEdge.position.z = -.01;
  exit.group.add(exitEdge);
  const exitTickMaterial = new THREE.MeshBasicMaterial({ color: 0xc3edf0 });
  for (let tick = 0; tick < 3; tick += 1) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(.445, .006, 6, 20, .23), exitTickMaterial);
    arc.rotation.z = tick * Math.PI * 2 / 3 + .28;
    exit.group.add(arc);
  }

  const probe = new THREE.Group();
  const probeMaterial = new THREE.MeshStandardMaterial({ color: 0xeeffd2, emissive: 0xc8ff64, emissiveIntensity: 2.1, metalness: .3, roughness: .2 });
  const probeBody = new THREE.Mesh(new THREE.OctahedronGeometry(.075), probeMaterial);
  const probeBand = new THREE.Mesh(new THREE.TorusGeometry(.105, .008, 6, 24), new THREE.MeshBasicMaterial({ color: 0xe3ff9b }));
  probeBand.rotation.x = .8;
  probe.add(probeBody, probeBand);
  const probeLight = new THREE.PointLight(0xc8ff64, .9, 1.4, 2);
  probe.add(probeLight);
  scene.add(probe);
  const trailCount = 20;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailColors = new Float32Array(trailCount * 3);
  const trailColor = new THREE.Color(0xc8ff64);
  for (let point = 0; point < trailCount; point += 1) {
    const intensity = (1 - point / (trailCount - 1)) ** 2;
    trailColors.set([trailColor.r * intensity, trailColor.g * intensity, trailColor.b * intensity], point * 3);
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  const probeTrail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false }));
  // A moving buffer has no stable bounding sphere; it is only twenty vertices.
  probeTrail.frustumCulled = false;
  scene.add(probeTrail);

  let worlds;
  try { worlds = createUniverseView(renderer); }
  catch (error) { disposeTree(scene); environment.dispose(); renderer.dispose(); throw error; }
  entry.setWorld(worlds.texture, worlds.outputResolution);

  const transit = createTransit({ duration: 3.2, universeCount: UNIVERSES.length });
  const gesture = createGesture();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const entryWorld = new THREE.Vector3();
  const exitWorld = new THREE.Vector3();
  const entryNormal = new THREE.Vector3();
  const exitNormal = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, 1);
  const trailPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const startRotation = new THREE.Quaternion();
  const baseRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(BASE_X, BASE_Y, 0));
  let yaw = BASE_Y, pitch = BASE_X, velocityX = 0, velocityY = 0;
  let hover = -1, dragging = false, pointerDown = false;
  let width = 1, height = 1, frame = 0, lastTime = 0, time = 0;
  let destroyed = false, failed = false, ready = false, onscreen = true;
  let previousPhase = '', previousCount = -1;
  const listeners = [];
  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  }
  function canRender() { return !destroyed && !failed && onscreen && !document.hidden; }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function schedule() { if (!frame && motion && canRender()) frame = requestAnimationFrame(animate); }
  function notify(force = false) {
    const state = transit.snapshot();
    if (force || state.phase !== previousPhase || state.completedCount !== previousCount) {
      previousPhase = state.phase;
      previousCount = state.completedCount;
      onStatus?.({ ...state, universeName: UNIVERSES[state.currentUniverse].name, destinationName: UNIVERSES[state.destinationUniverse].name });
    }
    return state;
  }
  function fail(error) {
    if (failed || destroyed) return;
    failed = true;
    stop();
    transit.finish();
    destroy();
    onError?.(error);
  }
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };

  function updateWorldCameras(travel = 0) {
    scene.updateMatrixWorld(true);
    worlds.update({ camera, entranceMatrix: entry.group.matrixWorld, time, travel });
  }
  function commitWorld() {
    const index = transit.snapshot().currentUniverse;
    if (index !== worlds.currentIndex) worlds.commit(index);
  }
  function finishFlight() {
    if (!transit.snapshot().active) return;
    // An interrupted/instant trip resolves at the same aligned aperture as a full trip.
    yaw = BASE_Y; pitch = BASE_X;
    artifact.group.quaternion.copy(baseRotation);
    updateWorldCameras(1);
    transit.finish();
    commitWorld();
  }

  function project(point) {
    projected.copy(point).project(camera);
    return { x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height };
  }
  function probePosition(progress, target) {
    if (progress < .43) {
      const t = ease((progress - .1) / .33);
      target.copy(entryWorld).addScaledVector(entryNormal, .13 + .52 * (1 - t));
      target.x -= 1.1 * (1 - t);
      target.y += .55 * (1 - t) + Math.sin(t * Math.PI) * .1;
    } else if (progress < .64) {
      const t = ease((progress - .43) / .17);
      target.copy(entryWorld).addScaledVector(entryNormal, .13 - .72 * t);
    } else {
      const t = ease((progress - .64) / .23);
      target.copy(exitWorld).addScaledVector(exitNormal, -.24 + .9 * t);
      target.x += .58 * t;
      target.y += .38 * t;
    }
    return target;
  }
  function render(delta = 0) {
    if (!canRender()) return;
    const state = transit.snapshot();
    const p = state.progress;
    const cinematic = sampleCinematics(p, state.active);
    const travelProgress = state.active ? ease((p - .58) / .36) : 0;
    const opening = state.active ? ease(p / .23) * (1 - ease((p - .8) / .2)) : 0;
    if (state.active) {
      artifact.group.quaternion.copy(startRotation).slerp(baseRotation, ease(p / .23));
      yaw = BASE_Y; pitch = BASE_X;
    } else {
      if (motion && !pointerDown) {
        yaw += velocityX * delta;
        pitch = clamp(pitch + velocityY * delta, -1.15, 1.15);
        velocityX *= Math.exp(-delta * 7);
        velocityY *= Math.exp(-delta * 7);
      }
      artifact.group.rotation.set(pitch + (motion ? Math.sin(time * .25) * .015 : 0), yaw + (motion ? Math.sin(time * .16) * .045 : 0), 0);
    }
    artifact.update({ time, hover: state.active ? -1 : hover, opening, motion });
    const entryTransfer = state.active ? Math.sin(Math.PI * clamp((p - .39) / .22, 0, 1)) : 0;
    const exitTransfer = state.active ? Math.sin(Math.PI * clamp((p - .63) / .24, 0, 1)) : 0;
    entry.update(time, .28 + opening * .75, entryTransfer);
    entry.setColor(worlds.destinationPreset.accent);
    exit.update(time, .08 + opening * 1.1, exitTransfer);
    exitRim.material.emissiveIntensity = .3 + opening * 1.5;
    bounce.color.set(worlds.currentPreset.accent);
    bounce.intensity = 2.4 + cinematic.energy * 3.4;
    rim.color.set(worlds.destinationPreset.accent);
    rim.intensity = 4.6 + cinematic.energy * 2.2;
    flux.update({ time, ...cinematic, color: worlds.destinationPreset.accent });
    space.update(time);
    scene.updateMatrixWorld(true);
    entry.group.getWorldPosition(entryWorld);
    exit.group.getWorldPosition(exitWorld);
    entryNormal.copy(forward).transformDirection(entry.group.matrixWorld);
    exitNormal.copy(forward).transformDirection(exit.group.matrixWorld);

    probe.visible = true;
    probe.scale.setScalar(1);
    probe.quaternion.setFromUnitVectors(forward, p >= .64 ? exitNormal : entryNormal);
    if (state.active) {
      probePosition(p, probe.position);
      if (p >= .43 && p < .60) {
        const t = ease((p - .43) / .17);
        const stretch = Math.sin(Math.PI * t);
        probe.scale.set(1 - stretch * .55, 1 - stretch * .55, 1 + stretch * 3);
      } else if (p < .64) {
        probe.visible = p < .60;
      } else if (p < .84) {
        const stretch = 1 - ease((p - .68) / .14);
        probe.scale.set(1 - stretch * .55, 1 - stretch * .55, 1 + stretch * 3);
      }
    } else if (state.completedCount > 0) {
      probePosition(1, probe.position);
    } else {
      probePosition(0, probe.position);
    }
    probeTrail.visible = state.active && (p > .12 && p < .60 || p > .67 && p < .92);
    if (probeTrail.visible) {
      for (let point = 0; point < trailCount; point += 1) {
        const sample = Math.max(p < .64 ? 0 : .64, p - point / (trailCount - 1) * .055);
        probePosition(sample, trailPoint);
        trailPoint.toArray(trailPositions, point * 3);
      }
      trailGeometry.attributes.position.needsUpdate = true;
    }
    probeLight.intensity = .9 + (entryTransfer + exitTransfer) * 1.25;
    if (motion) { probeBody.rotation.y = time * .7; probeBand.rotation.z = time * .35; probe.position.y += Math.sin(time * 1.2) * .015 * (state.active ? 0 : 1); }
    try {
      updateWorldCameras(travelProgress);
      const mouth = project(entryWorld);
      worlds.render({ artifactScene: scene, camera, reveal: travelProgress,
        energy: cinematic.energy, travel: travelProgress, time,
        center: { x: mouth.x / width, y: mouth.y / height } });
      if (shaderFailed) {
        fail(new Error('The portal shader could not compile.'));
        return;
      }
      if (failed || destroyed) return;
      if (!ready && !failed) {
        ready = true;
        onReady?.();
      }
    } catch (error) { fail(error); return; }
    onFrame?.({ ...state, entry: project(entryWorld), exit: project(exitWorld) });
    notify();
  }
  function animate(timestamp) {
    frame = 0;
    if (!canRender() || !motion) return;
    const delta = lastTime ? Math.min(.06, (timestamp - lastTime) / 1000) : 0;
    lastTime = timestamp;
    time += delta;
    const wasActive = transit.snapshot().active;
    transit.advance(delta);
    if (wasActive && !transit.snapshot().active) commitWorld();
    render(delta);
    schedule();
  }
  function resize() {
    if (destroyed || failed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // The whole object, both mouths and the probe remain inside a phone viewport.
    const verticalSpan = Math.max(4.7, 6.0 / camera.aspect);
    camera.position.set(.25, .12, verticalSpan / (2 * Math.tan(THREE.MathUtils.degToRad(18))));
    camera.lookAt(.25, .05, 0);
    camera.updateProjectionMatrix();
    worlds.resize();
    render();
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(artifact.group.children, true)[0]?.object;
  }
  function teleport() {
    if (!canRender() || transit.snapshot().active) return false;
    startRotation.copy(artifact.group.quaternion);
    const started = transit.start();
    if (!started) return false;
    velocityX = velocityY = 0;
    hover = -1;
    if (!motion) finishFlight();
    notify(); render(); schedule();
    return true;
  }
  function clearGesture() {
    pointerDown = dragging = false;
    hover = -1;
    gesture.cancel();
    velocityX = velocityY = 0;
  }
  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || transit.snapshot().active) return;
    const started = gesture.begin(event.pointerId, event.clientX, event.clientY);
    pointerDown = started;
    dragging = false;
    velocityX = velocityY = 0;
    hover = -1;
    if (started) canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, 'pointermove', event => {
    const change = gesture.move(event.pointerId, event.clientX, event.clientY);
    if (change?.dragging && !transit.snapshot().active) {
      dragging = true;
      yaw += change.dx * .006;
      pitch = clamp(pitch + change.dy * .006, -1.15, 1.15);
      velocityX = motion ? clamp(change.dx * .14, -2, 2) : 0;
      velocityY = motion ? clamp(change.dy * .14, -1, 1) : 0;
      render();
    } else if (event.pointerType === 'mouse' && !pointerDown && !transit.snapshot().active) {
      const object = pick(event);
      let part = object;
      while (part && part.userData.index === undefined) part = part.parent;
      hover = part?.userData.index ?? -1;
      canvas.style.cursor = object?.userData.core ? 'pointer' : 'grab';
      if (!motion) render();
    }
  });
  listen(canvas, 'pointerup', event => {
    const result = gesture.end(event.pointerId, event.clientX, event.clientY);
    pointerDown = dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (result?.tap && pick(event)?.userData.core) teleport();
    if (!motion) render();
  });
  listen(canvas, 'pointercancel', () => { clearGesture(); render(); });
  listen(canvas, 'lostpointercapture', () => {
    if (!pointerDown) return;
    clearGesture(); render();
  });
  listen(canvas, 'pointerleave', () => { hover = -1; if (!motion) render(); });
  listen(canvas, 'keydown', event => {
    const keys = { ArrowLeft: [-.14, 0], ArrowRight: [.14, 0], ArrowUp: [0, -.14], ArrowDown: [0, .14] };
    if (!keys[event.key] || transit.snapshot().active) return;
    event.preventDefault();
    yaw += keys[event.key][0]; pitch = clamp(pitch + keys[event.key][1], -1.15, 1.15);
    velocityX = velocityY = 0;
    render();
  });
  listen(document, 'visibilitychange', () => {
    clearGesture(); stop();
    if (document.hidden) { finishFlight(); notify(); }
    else { render(); schedule(); }
  });
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); fail(new Error('The graphics context was interrupted.')); });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    if (!onscreen) { clearGesture(); stop(); finishFlight(); notify(); }
    else { render(); schedule(); }
  });
  intersectionObserver.observe(canvas);

  function destroy() {
    if (destroyed) return;
    destroyed = true; stop();
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    listeners.forEach(remove => remove());
    disposeTree(scene);
    worlds.dispose();
    environment.dispose();
    renderer.dispose();
  }
  listen(window, 'pagehide', event => { if (!event.persisted) destroy(); });
  resize(); schedule();
  return {
    teleport,
    setMotion(enabled) {
      motion = Boolean(enabled);
      clearGesture(); stop();
      if (!motion) finishFlight();
      notify(true);
      render(); schedule();
    },
    reset() {
      if (transit.snapshot().active) return;
      yaw = BASE_Y; pitch = BASE_X;
      clearGesture(); render();
    },
    destroy,
  };
}
