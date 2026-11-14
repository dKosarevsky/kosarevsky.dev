import assert from 'node:assert/strict';
import { initMultiverse } from '../assets/multiverse.js';

function target() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    dataset: {}, style: {}, disabled: false, hidden: false, textContent: '', tabIndex: -1,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    getAttribute: name => attributes.get(name),
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener: (name, listener) => listeners.get(name)?.delete(listener),
    emit: (name, event = {}) => { for (const listener of listeners.get(name) ?? []) listener(event); },
    listenerCount: () => [...listeners.values()].reduce((sum, group) => sum + group.size, 0),
  };
}

function harness() {
  const original = new Map();
  const frames = new Map();
  let nextFrame = 0;
  let observer;
  const document = { ...target(), hidden: false };
  const window = target();
  const host = target();
  const selectors = ['canvas', '[data-node-teleport]', '[data-node-reset]', '[data-node-status]', '[data-node-phase]', '[data-node-count]', '[data-node-progress]', '[data-node-entry]', '[data-node-exit]', '[data-node-retry]'];
  const elements = Object.fromEntries(selectors.map(selector => [selector, target()]));
  host.querySelector = selector => elements[selector];
  function install(name, value) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  install('document', document);
  install('window', window);
  install('requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame; });
  install('cancelAnimationFrame', id => frames.delete(id));
  install('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; observer = this; this.disconnected = false; }
    observe(element) { assert.equal(element, host); }
    disconnect() { this.disconnected = true; }
  });
  return {
    host, elements, document, window, frames,
    intersect(visible) {
      assert.ok(observer, 'the lazy loader must observe artwork visibility');
      observer.callback([{ isIntersecting: visible }]);
    },
    step() { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(16)); },
    restore() {
      for (const [name, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
    get observer() { return observer; },
  };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function sceneModule() {
  const calls = { create: 0, destroy: 0, teleport: 0, reset: 0, motions: [] };
  let callbacks;
  return {
    calls,
    get callbacks() { return callbacks; },
    module: { createNode(options) {
      callbacks = options; calls.create++;
      return {
        destroy() { calls.destroy++; }, teleport() { calls.teleport++; }, reset() { calls.reset++; },
        setMotion(value) { calls.motions.push(value); },
      };
    } },
  };
}

{
  const h = harness(), runtime = sceneModule();
  let loads = 0;
  try {
    const controller = initMultiverse(h.host, { loadScene: async () => { loads++; return runtime.module; } });
    assert.equal(loads, 0, 'the heavy renderer must not load before the artwork is visible');
    h.intersect(true); h.step();
    assert.equal(loads, 0, 'the poster gets a paint before the heavy renderer loads');
    h.step(); await settle();
    assert.equal(loads, 1);
    assert.equal(runtime.calls.create, 1);
    assert.equal(h.host.dataset.scene, 'loading');
    assert.equal(h.elements['[data-node-teleport]'].disabled, true, 'controls wait for a successful GPU frame');
    runtime.callbacks.onReady();
    assert.equal(h.host.dataset.scene, 'ready');
    assert.equal(h.elements.canvas.tabIndex, 0);
    h.elements['[data-node-teleport]'].emit('click');
    h.elements['[data-node-reset]'].emit('click');
    assert.equal(runtime.calls.teleport, 1);
    assert.equal(runtime.calls.reset, 1);
    controller.destroy(); controller.destroy();
    assert.equal(runtime.calls.destroy, 1);
    assert.equal(h.observer.disconnected, true);
    assert.equal(h.elements['[data-node-teleport]'].listenerCount(), 0);
    assert.equal(h.document.listenerCount(), 0);
    assert.equal(h.window.listenerCount(), 0);
  } finally { h.restore(); }
}
{
  const h = harness(), runtime = sceneModule(), loading = deferred();
  try {
    const controller = initMultiverse(h.host, { loadScene: () => loading.promise });
    h.intersect(true); h.step(); h.step();
    controller.destroy();
    loading.resolve(runtime.module); await settle();
    assert.equal(runtime.calls.create, 0, 'a late import must never revive disposed artwork');
    assert.equal(h.frames.size, 0);
  } finally { h.restore(); }
}
{
  const h = harness(), runtime = sceneModule(), loading = deferred();
  try {
    const controller = initMultiverse(h.host, { motion: true, loadScene: () => loading.promise });
    h.intersect(true); h.step(); h.step();
    controller.setMotion(false);
    h.intersect(false);
    loading.resolve(runtime.module); await settle();
    assert.equal(runtime.calls.create, 0, 'an import that finishes offscreen waits to mount');
    h.intersect(true); h.step(); h.step(); await settle();
    assert.equal(runtime.callbacks.motion, false, 'the latest shared preference wins an import race');
    controller.setMotion(true);
    assert.deepEqual(runtime.calls.motions, [true]);
    controller.destroy();
  } finally { h.restore(); }
}
{
  const h = harness();
  try {
    const controller = initMultiverse(h.host, { loadScene: async () => { throw new Error('Network unavailable'); } });
    h.intersect(true); h.step(); h.step(); await settle();
    assert.equal(h.host.dataset.scene, 'fallback');
    assert.equal(h.elements['[data-node-teleport]'].disabled, true);
    assert.equal(h.elements.canvas.tabIndex, -1);
    assert.equal(h.host.getAttribute('aria-busy'), 'false');
    assert.match(h.elements['[data-node-status]'].textContent, /still|unavailable/i);
    assert.equal(h.elements['[data-node-retry]'].hidden, false);
    controller.destroy();
  } finally { h.restore(); }
}
{
  const h = harness(), runtime = sceneModule();
  try {
    const controller = initMultiverse(h.host, { loadScene: async () => runtime.module });
    h.intersect(true); h.step(); h.step(); await settle();
    runtime.callbacks.onReady();
    runtime.callbacks.onStatus({ active: true, phase: 'transfer', completedCount: 0 });
    assert.equal(h.elements['[data-node-teleport]'].disabled, true);
    runtime.callbacks.onStatus({ active: false, phase: 'arrive', completedCount: 1 });
    assert.equal(h.elements['[data-node-count]'].textContent, '001');
    assert.equal(h.elements['[data-node-teleport]'].disabled, false);
    runtime.callbacks.onError(new Error('Context lost'));
    assert.equal(h.host.dataset.scene, 'fallback');
    assert.equal(runtime.calls.destroy, 1, 'runtime failure cleans up the mounted scene');
    controller.destroy();
    assert.equal(runtime.calls.destroy, 1);
  } finally { h.restore(); }
}
console.log('Multiverse loader checks passed: first-frame readiness, deferred import, shared motion race, failure fallback, input, teardown, and late import disposal.');
