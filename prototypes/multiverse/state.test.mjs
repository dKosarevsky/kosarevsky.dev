import assert from 'node:assert/strict';
import test from 'node:test';
import { createGesture, createTransit } from '../../src/multiverse/state.js';

test('transit starts idle and rejects activation during a flight', () => {
  const transit = createTransit();
  assert.deepEqual(transit.snapshot(), {
    active: false, progress: 0, phase: 'idle', completedCount: 0,
  });
  assert.equal(transit.start(), true);
  transit.advance(0.5);
  const before = transit.snapshot();
  assert.equal(transit.start(), false);
  assert.equal(transit.start({ instant: true }), false);
  assert.deepEqual(transit.snapshot(), before);
});

test('a default flight visits every phase and finishes at 2.35 seconds', () => {
  const transit = createTransit();
  transit.start();
  assert.equal(transit.snapshot().phase, 'align');
  transit.advance(0.7);
  assert.equal(transit.snapshot().phase, 'open');
  transit.advance(0.5);
  assert.equal(transit.snapshot().phase, 'transfer');
  transit.advance(0.9);
  assert.equal(transit.snapshot().phase, 'arrive');
  assert.equal(transit.snapshot().active, true);
  transit.advance(0.25);
  assert.deepEqual(transit.snapshot(), {
    active: false, progress: 1, phase: 'arrive', completedCount: 1,
  });
});

test('finishing a paused or hidden flight counts completion exactly once', () => {
  for (const elapsed of [0, 0.7, 1.2, 2.1]) {
    const transit = createTransit();
    transit.start();
    transit.advance(elapsed);
    transit.finish();
    transit.finish();
    transit.advance(30);
    assert.deepEqual(transit.snapshot(), {
      active: false, progress: 1, phase: 'arrive', completedCount: 1,
    });
  }
});

test('idle finishing does nothing and subsequent flights count separately', () => {
  const transit = createTransit();
  transit.finish();
  assert.equal(transit.snapshot().completedCount, 0);
  assert.equal(transit.start({ instant: true }), true);
  assert.equal(transit.snapshot().active, false);
  assert.equal(transit.snapshot().completedCount, 1);
  assert.equal(transit.start(), true);
  assert.equal(transit.snapshot().progress, 0);
  transit.finish();
  assert.equal(transit.snapshot().completedCount, 2);
});

test('elapsed stays finite, never moves backwards and clamps to the end', () => {
  const transit = createTransit({ duration: 2 });
  transit.start();
  transit.advance(0.5);
  for (const invalid of [-1, NaN, Infinity, -Infinity, undefined]) {
    transit.advance(invalid);
    assert.equal(transit.snapshot().progress, 0.25);
  }
  transit.advance(Number.MAX_VALUE);
  assert.equal(transit.snapshot().progress, 1);
  assert.equal(transit.snapshot().completedCount, 1);
  transit.advance(1);
  assert.equal(transit.snapshot().completedCount, 1);
});

test('snapshots are copies, not mutable internal state', () => {
  const transit = createTransit();
  const snapshot = transit.snapshot();
  snapshot.active = true;
  snapshot.completedCount = 99;
  assert.equal(transit.start(), true);
  assert.equal(transit.snapshot().completedCount, 0);
});

test('a short primary-pointer gesture is a tap', () => {
  const gesture = createGesture();
  gesture.begin(3, 100, 200);
  assert.deepEqual(gesture.move(3, 102, 201), { dx: 2, dy: 1, dragging: false });
  assert.deepEqual(gesture.end(3, 102, 201), { tap: true, dragging: false });
  assert.equal(gesture.end(3, 102, 201), null);
});

test('many individually short moves accumulate distance from pointerdown', () => {
  const gesture = createGesture();
  gesture.begin(3, 0, 0);
  for (const x of [2, 4, 6]) {
    assert.deepEqual(gesture.move(3, x, 0), { dx: 2, dy: 0, dragging: false });
  }
  assert.deepEqual(gesture.move(3, 8, 0), { dx: 2, dy: 0, dragging: true });
  assert.deepEqual(gesture.end(3, 8, 0), { tap: false, dragging: true });
});

test('the threshold uses CSS pixels and Euclidean distance including pointerup', () => {
  const gesture = createGesture({ threshold: 7 });
  gesture.begin(1, 10, 10);
  assert.deepEqual(gesture.end(1, 14, 15), { tap: true, dragging: false });
  gesture.begin(2, 10, 10);
  assert.deepEqual(gesture.end(2, 17, 10), { tap: false, dragging: true });
  gesture.begin(3, 10, 10);
  assert.deepEqual(gesture.end(3, 15, 15), { tap: false, dragging: true });
});

test('a drag remains a drag after returning to the origin', () => {
  const gesture = createGesture();
  gesture.begin(1, 0, 0);
  gesture.move(1, 20, 0);
  gesture.move(1, 0, 0);
  assert.deepEqual(gesture.end(1, 0, 0), { tap: false, dragging: true });
});

test('events from a different pointer cannot move or end the active gesture', () => {
  const gesture = createGesture();
  gesture.begin(1, 0, 0);
  assert.equal(gesture.move(2, 100, 100), null);
  assert.equal(gesture.end(2, 100, 100), null);
  assert.deepEqual(gesture.end(1, 1, 1), { tap: true, dragging: false });
});

test('pointer cancellation prevents activation and permits a later fresh gesture', () => {
  const gesture = createGesture();
  gesture.begin(1, 0, 0);
  gesture.cancel();
  assert.equal(gesture.move(1, 1, 1), null);
  assert.equal(gesture.end(1, 1, 1), null);
  gesture.begin(2, 0, 0);
  assert.deepEqual(gesture.end(2, 1, 1), { tap: true, dragging: false });
});

test('multiple touches interrupt activation until every involved pointer is up', () => {
  const gesture = createGesture();
  gesture.begin(1, 0, 0);
  gesture.begin(2, 20, 20);
  assert.equal(gesture.move(1, 1, 1), null);
  assert.equal(gesture.end(1, 1, 1), null);
  gesture.begin(3, 30, 30);
  assert.equal(gesture.end(2, 20, 20), null);
  assert.equal(gesture.end(3, 30, 30), null);
  gesture.begin(4, 0, 0);
  assert.deepEqual(gesture.end(4, 0, 0), { tap: true, dragging: false });
});
