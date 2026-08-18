import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('password recovery email is marked as the saved account identifier', async () => {
  const authForm = await readFile(new URL('../components/AuthForm.vue', import.meta.url), 'utf8');
  assert.match(authForm, /<input id="forgot-email"[\s\S]*?autocomplete="username" required/);
});
