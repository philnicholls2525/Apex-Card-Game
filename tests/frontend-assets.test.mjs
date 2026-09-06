import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const iend = Buffer.from('IEND');

async function pngsIn(directory) {
  const names = await readdir(directory);
  return names.filter(name => name.endsWith('.png')).map(name => join(directory, name));
}

test('all finished card and reveal PNGs are complete browser-decodable files', async () => {
  const paths = [
    ...(await pngsIn('assets/cards/debut-edition/base')),
    ...(await pngsIn('assets/cards/debut-edition')),
    ...(await pngsIn('assets/brand/reveal/debut-edition-26-27')),
  ];

  assert.equal(paths.length, 23);
  for (const path of paths) {
    const file = await readFile(path);
    assert.deepEqual(file.subarray(0, 8), pngSignature, `${path} has an invalid PNG signature`);
    assert.equal(file.subarray(-8, -4).compare(iend), 0, `${path} is truncated before its IEND chunk`);
  }
});

test('online UI uses the packaged layered card and reveal pipeline', async () => {
  const source = await readFile('src/main.js', 'utf8');
  assert.match(source, /parallel-frame-art/);
  assert.match(source, /reveal-card-base\.png/);
  assert.match(source, /is-revealing/);
  assert.match(source, /open\.reveal/);
});
