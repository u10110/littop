import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('static menu links are rendered only for administrators', async () => {
  const appSource = await readFile(new URL('../App.vue', import.meta.url), 'utf8');
  assert.match(appSource, /const isAdmin = computed\(\(\) => currentUser\.value\?\.role === 'admin'\);/);
  assert.match(appSource, /<template v-if="isAdmin">[\s\S]*?to="\/promotion"[\s\S]*?to="\/about"[\s\S]*?<\/template>/);
});
