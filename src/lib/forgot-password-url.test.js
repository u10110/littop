import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('forgot-password URL opens the recovery form immediately', async () => {
  const loginSource = await readFile(new URL('../components/Login.vue', import.meta.url), 'utf8');
  assert.match(loginSource, /if \(route\.query\?\.auth === 'forgot'\) return 'forgot';/);
});
