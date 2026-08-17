import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('all registration entry points require acceptance of the user agreement', async () => {
  const form = await readFile(new URL('./AuthForm.vue', import.meta.url), 'utf8');
  const app = await readFile(new URL('../App.vue', import.meta.url), 'utf8');
  const router = await readFile(new URL('../router/index.js', import.meta.url), 'utf8');

  for (const registrationTemplate of [form, app]) {
    assert.match(registrationTemplate, /v-model="registerForm\.acceptTerms"/);
    assert.match(registrationTemplate, /Я принимаю/);
    assert.match(registrationTemplate, /Пользовательское соглашение/);
    assert.match(registrationTemplate, /to="\/terms"/);
  }
  assert.match(app, /acceptTerms:\s*true/);
  assert.match(router, /path:\s*'\/terms'/);
});

test('agreement checkbox uses the current visual style', async () => {
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.terms-check\s*\{/);
  assert.match(styles, /\.terms-link\s*\{/);
});
