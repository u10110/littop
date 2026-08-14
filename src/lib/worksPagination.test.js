import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWorksPagination } from './worksPagination.js';

test('buildWorksPagination shows a next page only when the API returned an extra work', () => {
  const fullPage = buildWorksPagination({ page: 1, pageSize: 24, items: Array.from({ length: 25 }) });
  assert.equal(fullPage.hasPrevious, false);
  assert.equal(fullPage.hasNext, true);
  assert.equal(fullPage.items.length, 24);

  const lastPage = buildWorksPagination({ page: 2, pageSize: 24, items: Array.from({ length: 7 }) });
  assert.equal(lastPage.hasPrevious, true);
  assert.equal(lastPage.hasNext, false);
  assert.equal(lastPage.items.length, 7);
});

test('buildWorksPagination identifies a direct link to an empty non-first page as invalid', () => {
  assert.equal(buildWorksPagination({ page: 3, pageSize: 24, items: [] }).isInvalidPage, true);
  assert.equal(buildWorksPagination({ page: 1, pageSize: 24, items: [] }).isInvalidPage, false);
});
