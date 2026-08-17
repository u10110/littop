import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public author page renders the saved cover image', async () => {
  const page = await readFile(new URL('./AuthorPage.vue', import.meta.url), 'utf8');

  assert.match(page, /v-if="author\.coverImageUrl"/);
  assert.match(page, /:src="author\.coverImageUrl"/);
  assert.match(page, /Большое фото автора/);
});
