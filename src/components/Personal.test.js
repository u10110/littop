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
  assert.match(page, /v-if="profileForm.avatarUrl" class="author-photo"/);
  assert.match(page, /v-if="profileForm.coverImageUrl" class="cover-photo-image"/);
  assert.doesNotMatch(page, /<article class="dash-card photo-card">/);
  const photoSettingsIndex = page.indexOf('<article class="dash-card image-settings-card">');
  const cabinetTopEnd = page.indexOf('</section>', page.indexOf('<section class="cabinet-top">'));
  assert.ok(photoSettingsIndex > -1 && photoSettingsIndex < cabinetTopEnd, 'photo controls belong in the top cabinet row');
});
