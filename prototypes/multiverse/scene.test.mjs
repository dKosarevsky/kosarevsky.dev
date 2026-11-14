import test from 'node:test';
import assert from 'node:assert/strict';
import { createNode } from '../../src/multiverse/scene.js';

for (const missing of ['ResizeObserver', 'IntersectionObserver']) {
  test(`missing ${missing} falls back before touching the GPU canvas`, () => {
    const saved = new Map(['ResizeObserver', 'IntersectionObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    let touchedCanvas = false;
    try {
      for (const name of saved.keys()) Object.defineProperty(globalThis, name, { value: name === missing ? undefined : class {}, configurable: true });
      const canvas = new Proxy({}, { get() { touchedCanvas = true; throw new Error('GPU initialization started'); } });
      assert.throws(() => createNode({ canvas }), /resize and visibility observers/i);
      assert.equal(touchedCanvas, false);
    } finally {
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    }
  });
}
