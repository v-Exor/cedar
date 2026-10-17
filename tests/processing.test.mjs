import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
await import('../processing.js');
const { validate, stretch, statistics, processImage } = globalThis.HistogramLab;
const filename = fileURLToPath(new URL('../assets/vendor/opencv.js', import.meta.url));
const runtime = new Module(filename); runtime.filename = filename; runtime.paths = Module._nodeModulePaths(fileURLToPath(new URL('../assets/vendor/', import.meta.url)));
runtime._compile(readFileSync(filename, 'utf8'), filename);
// Emscripten modules can themselves be thenable; resolve a wrapper instead.
const { cv } = await new Promise((resolve, reject) => runtime.exports.then(cv => resolve({ cv }), reject));
const fixtures = JSON.parse(readFileSync(new URL('./opencv-fixtures.json', import.meta.url), 'utf8'));
test('all browser outputs and histograms agree with independently generated Python/OpenCV fixtures', () => {
  for (const fixture of fixtures.cases) {
    const result = processImage(cv, new Uint8ClampedArray(fixture.rgba), fixture.width, fixture.height, fixture.parameters);
    for (const [key, expected] of Object.entries(fixture.expected)) {
      const actual = result.images[key];
      assert.deepEqual([...actual.rgba], expected.rgba, `${fixture.name}: ${key} output pixels`);
      assert.deepEqual([...actual.histogram], expected.histogram, `${fixture.name}: ${key} histogram`);
      for (const metric of ['mean', 'std', 'entropy']) assert.ok(Math.abs(actual[metric] - expected[metric]) < 1e-9, `${fixture.name}: ${key} ${metric}`);
    }
  }
});
test('global-only operation preserves constant input and returns only the required versions', () => {
  const f = fixtures.cases[0]; const r = processImage(cv, new Uint8Array(f.rgba), f.width, f.height, f.parameters, 'global');
  assert.deepEqual(Object.keys(r.images), ['input', 'global']);
  assert.deepEqual(r.images.input.rgba, r.images.global.rgba);
  assert.equal(r.images.input.std, 0);
});
test('percentile stretching covers endpoints, interpolates quantiles and handles constant input', () => {
  assert.deepEqual([...stretch(new Uint8Array([100, 110, 120]), 0).pixels], [0, 128, 255]);
  const constant = new Uint8Array([112, 112, 112]); assert.deepEqual(stretch(constant, 2).pixels, constant);
  const s = stretch(new Uint8Array([0, 10, 20, 30, 40]), 2); assert.equal(s.low, 0.8); assert.equal(s.high, 39.2);
  assert.equal(statistics(constant).entropy, 0);
});
test('malformed parameters, dimensions, and buffers fail before OpenCV allocation', () => {
  const p = { mode: 'gray', clip: 2, tiles: 8, percent: 2 };
  for (const invalid of [{ mode: 'rgb' }, { clip: 0 }, { clip: NaN }, { tiles: 1 }, { tiles: 2.5 }, { percent: -1 }, { percent: 11 }]) assert.throws(() => validate({ ...p, ...invalid }));
  assert.throws(() => processImage(null, new Uint8Array(), 1, 1, p));
  assert.throws(() => processImage(null, new Uint8Array(), 2001, 2000, p));
  assert.throws(() => processImage(null, new Uint8Array(), -1, 0, p));
});
test('repeated grayscale and color runs return stable outputs', () => {
  for (const f of [fixtures.cases[2], fixtures.cases[8]]) {
    for (let i = 0; i < 12; i++) {
      const r = processImage(cv, new Uint8Array(f.rgba), f.width, f.height, f.parameters);
      assert.deepEqual([...r.images.clahe.histogram], f.expected.clahe.histogram);
    }
  }
});
