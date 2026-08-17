import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('registration requires acceptance of the user agreement and links to its page', async () => {
  const form = await readFile(new URL('./AuthForm.vue', import.meta.url), 'utf8');
  const router = await readFile(new URL('../router/index.js', import.meta.url), 'utf8');

  assert.match(form, /v-model="registerForm\.acceptTerms"/);
  assert.match(form, /Я принимаю/);
  assert.match(form, /Пользовательское соглашение/);
  assert.match(form, /to="\/terms"/);
  assert.match(router, /path:\s*'\/terms'/);
});

test('agreement checkbox uses the current visual style', async () => {
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.terms-check\s*\{/);
  assert.match(styles, /\.terms-link\s*\{/);
});
