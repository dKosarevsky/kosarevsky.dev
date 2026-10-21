import assert from 'node:assert/strict';
import { initOrb } from '../assets/orb.js';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
    emit(name, event = {}) {
      for (const listener of listeners.get(name) ?? []) listener(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((total, set) => total + set.size, 0);
    },
  };
}

function harness({ reduced = false } = {}) {
  const pendingFrames = new Map();
  const resizeObservers = [];
  const intersectionObservers = [];
  const savedGlobals = new Map();
  let nextFrameId = 1;
  let drawCount = 0;
  let bounds = { width: 650, height: 600, left: 0, top: 0 };
  const context = {
    clearRect(...args) { finite(args); drawCount += 1; },
    fillRect(...args) { finite(args); },
    setTransform(...args) { finite(args); },
    beginPath() {},
    moveTo(...args) { finite(args); },
    lineTo(...args) { finite(args); },
    stroke() {},
    fill() {},
    arc(...args) {
      finite(args);
      assert.ok(args[2] >= 0, 'rendered arcs have nonnegative radii');
    },
    createRadialGradient(...args) {
      finite(args);
      return { addColorStop() {} };
    },
  };
  const canvas = {
    ...eventTarget(),
    getContext: () => context,
    getBoundingClientRect: () => bounds,
  };
  const document = { ...eventTarget(), hidden: false };
  const media = { ...eventTarget(), matches: reduced };

  function finite(args) {
    assert.ok(args.every(Number.isFinite), 'canvas coordinates must stay finite');
  }

  function install(name, value) {
    savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }

  install('window', {
    devicePixelRatio: 3,
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return media;
    },
  });
  install('document', document);
  install('requestAnimationFrame', (callback) => {
    const id = nextFrameId++;
    pendingFrames.set(id, callback);
    return id;
  });
  install('cancelAnimationFrame', (id) => pendingFrames.delete(id));
  install('ResizeObserver', class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      resizeObservers.push(this);
    }
    observe(target) { assert.equal(target, canvas); }
    disconnect() { this.disconnected = true; }
  });
  install('IntersectionObserver', class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      intersectionObservers.push(this);
    }
    observe(target) { assert.equal(target, canvas); }
    disconnect() { this.disconnected = true; }
  });

  return {
    canvas,
    document,
    media,
    resizeObservers,
    intersectionObservers,
    get pendingCount() { return pendingFrames.size; },
    get drawCount() { return drawCount; },
    step(now) {
      const callbacks = [...pendingFrames.values()];
      pendingFrames.clear();
      for (const callback of callbacks) callback(now);
    },
    visibility(hidden) {
      document.hidden = hidden;
      document.emit('visibilitychange');
    },
    intersection(isIntersecting) {
      intersectionObservers[0].callback([{ isIntersecting }]);
    },
    resize(width, height) {
      bounds = { ...bounds, width, height };
      resizeObservers[0].callback([]);
    },
    restore() {
      for (const [name, descriptor] of savedGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

// The page must remain usable when Canvas 2D is unavailable.
for (const canvas of [null, {}, { getContext: () => null }]) {
  const orb = initOrb(canvas);
  assert.doesNotThrow(() => {
    orb.setMotion(true);
    orb.setMode('warp');
    orb.pulse();
    orb.destroy();
    orb.destroy();
  });
}

// Reduced motion provides a rendered still, and interactions cannot quietly
// restart the animation until the user explicitly enables it.
{
  const env = harness({ reduced: true });
  let orb;
  try {
    const modes = [];
    orb = initOrb(env.canvas, { onModeChange: (mode) => modes.push(mode) });
    assert.ok(env.drawCount > 0, 'reduced motion still renders the artwork');
    assert.equal(env.pendingCount, 0, 'reduced motion schedules no RAF');
    assert.equal(env.canvas.width, 1300, 'device pixel ratio is capped at two');
    assert.equal(env.canvas.height, 1200);
    assert.equal(env.media.listenerCount(), 0, 'the app owns media preference changes');

    orb.setMode('warp');
    orb.setMode('warp');
    orb.pulse();
    env.canvas.emit('click');
    env.canvas.emit('pointermove', { clientX: 300, clientY: 200 });
    assert.deepEqual(modes, ['warp'], 'mode notifications occur only on change');
    assert.equal(env.pendingCount, 0, 'no-motion interactions stay still');

    orb.setMode('unknown');
    assert.deepEqual(modes, ['warp', 'orbit'], 'unknown mode safely uses orbit');
    env.resize(320, 360);
    assert.equal(env.canvas.width, 640);
    assert.equal(env.pendingCount, 0, 'resizing a still does not start a loop');

    orb.setMotion(true);
    assert.equal(env.pendingCount, 1, 'enabling motion starts exactly one loop');
    orb.setMotion(true);
    orb.pulse();
    orb.setMode('warp');
    assert.equal(env.pendingCount, 1, 'repeated controls do not duplicate the loop');
    env.step(100);
    env.step(116);
    assert.equal(env.pendingCount, 1, 'a frame schedules exactly one successor');
    orb.setMotion(false);
    assert.equal(env.pendingCount, 0, 'disabling motion cancels its pending frame');
    const stillDrawCount = env.drawCount;
    env.step(132);
    assert.equal(env.drawCount, stillDrawCount, 'no frames execute after disabling');
  } finally {
    orb?.destroy();
    env.restore();
  }
}

// Hidden tabs and offscreen artwork pause independently. Destruction removes
// every listener and observer, including when a frame is already queued.
{
  const env = harness();
  let orb;
  try {
    orb = initOrb(env.canvas);
    assert.equal(env.pendingCount, 1);
    env.canvas.emit('pointermove', { clientX: 500, clientY: 250 });
    env.step(100);
    env.step(116);
    env.canvas.emit('pointerleave');

    env.visibility(true);
    assert.equal(env.pendingCount, 0, 'a hidden document pauses the animation');
    orb.pulse();
    assert.equal(env.pendingCount, 0, 'pulse cannot wake a hidden document');
    env.intersection(false);
    env.visibility(false);
    assert.equal(env.pendingCount, 0, 'visible tab remains paused while offscreen');
    env.intersection(true);
    assert.equal(env.pendingCount, 1, 'visible artwork resumes one loop');
    env.intersection(true);
    assert.equal(env.pendingCount, 1, 'duplicate observer events do not add loops');
    env.intersection(false);
    assert.equal(env.pendingCount, 0, 'offscreen artwork cancels the pending frame');
    env.intersection(true);
    assert.equal(env.pendingCount, 1);

    orb.destroy();
    assert.equal(env.pendingCount, 0, 'destroy cancels the pending frame');
    assert.equal(env.canvas.listenerCount(), 0, 'canvas event listeners are removed');
    assert.equal(env.document.listenerCount(), 0, 'visibility listener is removed');
    assert.ok(env.resizeObservers.every((observer) => observer.disconnected));
    assert.ok(env.intersectionObservers.every((observer) => observer.disconnected));

    const finalDrawCount = env.drawCount;
    assert.doesNotThrow(() => {
      orb.destroy();
      orb.setMotion(true);
      orb.setMode('warp');
      orb.pulse();
      env.resize(400, 400);
      env.intersection(true);
      env.visibility(false);
      env.canvas.emit('click');
      env.step(200);
    });
    assert.equal(env.pendingCount, 0, 'destroyed instances cannot restart');
    assert.equal(env.drawCount, finalDrawCount, 'destroyed instances cannot redraw');
  } finally {
    orb?.destroy();
    env.restore();
  }
}

console.log('Orb checks passed: fallback, reduced motion, controls, resize, RAF lifecycle, visibility, intersection, cleanup.');
