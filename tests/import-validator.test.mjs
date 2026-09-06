import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { value: null, getItem() { return this.value; } };
const { readLegacySave } = await import('../src/import-validator.js');
test('accepts a bounded v0.41/v0.42 local save', () => {
  localStorage.value = JSON.stringify({ coins: 250, inventory: { normal: 2 }, cards: { 'base:kane': { count: 1, lifetime: 1 } } });
  assert.deepEqual(readLegacySave(), { version: 10, coins: 250, inventory: { normal: 2 }, cards: { 'base:kane': { count: 1, lifetime: 1 } } });
});
test('rejects impossible balances', () => {
  localStorage.value = JSON.stringify({ coins: -1, inventory: {}, cards: {} });
  assert.throws(readLegacySave, /cannot be imported safely/);
});
