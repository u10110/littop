import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('password recovery route is not redirected to the personal page', async () => {
  const routerSource = await readFile(new URL('../router/index.js', import.meta.url), 'utf8');
  assert.doesNotMatch(routerSource, /\{ path: '\/login', redirect: '\/personal' \}/);
  assert.match(routerSource, /\{ path: '\/login', name: 'login', component: Login/);
});
