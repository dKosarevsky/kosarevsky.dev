import test from 'node:test';
import assert from 'node:assert/strict';
import { disposeTree } from '../../src/multiverse/space.js';

const cinematics = await import('../../src/multiverse/cinematics.js').catch(() => ({}));

test('cinematic envelopes vanish when inactive and at both ends of a flight', () => {
  assert.equal(typeof cinematics.sampleCinematics, 'function');
  for (const progress of [0, .2, .5, .8, 1, NaN, Infinity, -4, 4]) {
    assert.deepEqual(cinematics.sampleCinematics(progress, false), { energy: 0, travel: 0, arrival: 0 });
  }
  for (const progress of [0, 1, NaN, Infinity, -4, 4]) {
    assert.deepEqual(cinematics.sampleCinematics(progress, true), { energy: 0, travel: 0, arrival: 0 });
  }
});

test('charge precedes transit and arrival, with smooth bounded envelopes', () => {
  assert.equal(typeof cinematics.sampleCinematics, 'function');
  const charge = cinematics.sampleCinematics(.3, true);
  const transit = cinematics.sampleCinematics(.62, true);
  const arrival = cinematics.sampleCinematics(.86, true);
  assert.ok(charge.energy > .5 && charge.travel === 0 && charge.arrival === 0);
  assert.ok(transit.travel > .8 && transit.arrival === 0);
  assert.ok(arrival.arrival > .8 && arrival.travel < .4);
  let previous;
  for (let p = 0; p <= 1; p += .001) {
    const next = cinematics.sampleCinematics(p, true);
    for (const key of ['energy', 'travel', 'arrival']) {
      assert.ok(next[key] >= 0 && next[key] <= 1);
      if (previous) assert.ok(Math.abs(next[key] - previous[key]) < .04, 'no abrupt pulse');
    }
    previous = next;
  }
});

test('the flux field has real depth, a bounded draw count and repeatable frozen time', () => {
  assert.equal(typeof cinematics.createFluxField, 'function');
  const field = cinematics.createFluxField();
  const resources = new Set(), draws = [];
  field.group.traverse(object => {
    if (!object.geometry) return;
    draws.push(object);
    resources.add(object.geometry);
    for (const material of [].concat(object.material)) resources.add(material);
  });
  try {
    assert.ok(draws.length >= 3 && draws.length <= 9);
    const dust = draws.find(object => object.isPoints);
    assert.ok(dust && dust.geometry.attributes.position.count >= 200);
    const z = [...dust.geometry.attributes.position.array].filter((_, index) => index % 3 === 2);
    assert.ok(Math.max(...z) - Math.min(...z) > 3);
    const snapshot = () => {
      const values = [];
      field.group.traverse(object => {
        values.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray(), object.visible);
        for (const material of [].concat(object.material || [])) {
          for (const uniform of Object.values(material.uniforms || {})) {
            if (typeof uniform.value === 'number') values.push(uniform.value);
          }
        }
      });
      return values;
    };
    field.update({ time: 7, energy: .8, travel: .7, arrival: .5, color: 0x9abfff });
    const frozen = snapshot();
    field.update({ time: 7, energy: .8, travel: .7, arrival: .5, color: 0x9abfff });
    assert.deepEqual(snapshot(), frozen);
    field.update({ time: 17, energy: .1 });
    field.update({ time: 7, energy: .8, travel: .7, arrival: .5, color: 0x9abfff });
    assert.deepEqual(snapshot(), frozen, 'rewinding time cannot accumulate drift');
    field.update({ time: Infinity, energy: NaN, travel: Infinity, arrival: -3 });
    assert.ok(snapshot().filter(value => typeof value === 'number').every(Number.isFinite));
  } finally { disposeTree(field.group); }
});
