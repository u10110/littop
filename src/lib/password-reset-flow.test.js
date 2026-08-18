import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('successful reset request stays on the form and shows its confirmation', async () => {
  const login = await readFile(new URL('../components/Login.vue', import.meta.url), 'utf8');
  assert.match(login, /function onSuccess\(message\) \{/);
  assert.match(login, /successMessage\.value = message;/);
  assert.doesNotMatch(login, /function onSuccess\(\) \{\s*router\.push\('\/'\);\s*\}/);
});

test('password reset links from email are redirected from root to the reset form', async () => {
  const app = await readFile(new URL('../App.vue', import.meta.url), 'utf8');
  assert.match(app, /route\.query\?\.auth\s*!==\s*'reset'/);
  assert.match(app, /router\.replace\(/);
  assert.match(app, /path:\s*'\/login'/);
});
