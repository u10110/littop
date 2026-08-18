import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('login modal links to the password recovery flow', async () => {
  const appSource = await readFile(new URL('../App.vue', import.meta.url), 'utf8');
  assert.match(appSource, /<RouterLink[^>]+to="\/login\?auth=forgot"[^>]+@click="closeAuthModal"[^>]*>Забыли пароль\?<\/RouterLink>/);
});
