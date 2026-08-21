import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('personal cabinet provides controls to remove avatar and cover photo', async () => {
  const page = await readFile(new URL('./Personal.vue', import.meta.url), 'utf8');

  assert.match(page, /Удалить аватар/);
  assert.match(page, /@click="removeProfileImage\('avatar'\)"/);
  assert.match(page, /:disabled="profileImageBusy \|\| !profileForm.avatarUrl"/);
  assert.match(page, /Удалить обложку/);
  assert.match(page, /@click="removeProfileImage\('cover'\)"/);
  assert.match(page, /:disabled="profileImageBusy \|\| !profileForm.coverImageUrl"/);
  assert.doesNotMatch(page, /v-if="profileForm\.(avatarUrl|coverImageUrl)" class="btn btn-outline"/);
});
