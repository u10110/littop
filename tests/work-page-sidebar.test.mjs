import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const workPage = await readFile(new URL('../src/components/WorkPage.vue', import.meta.url), 'utf8');
const graphql = await readFile(new URL('../src/lib/graphql.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/assets/littop-reference.css', import.meta.url), 'utf8');

test('work page has a styled, complete owner edit form', () => {
  assert.match(workPage, /class="work-edit-form"/);
  assert.match(workPage, /class="work-edit-actions"/);
  assert.match(workPage, /@click="cancelEditing"/);
  assert.match(workPage, /genreSlug/);
  assert.match(css, /\.work-edit-form\s*\{/);
  assert.match(css, /\.work-edit-form input,\s*\.work-edit-form select,\s*\.work-edit-form textarea/);
});

test('work page loads and renders other author and similar works blocks', () => {
  assert.match(graphql, /WORK_PAGE_SIDEBAR_QUERY/);
  assert.match(graphql, /otherAuthorWorks:\s*works/);
  assert.match(graphql, /similarGenreWorks:\s*works/);
  assert.match(graphql, /similarSectionWorks:\s*works/);
  assert.match(workPage, /Другие произведения автора/);
  assert.match(workPage, /Похожие произведения/);
  assert.match(workPage, /otherAuthorWorks/);
  assert.match(workPage, /similarWorks/);
  assert.match(workPage, /String\(candidate\.id\) !== String\(work\.value\.id\)/);
  assert.match(workPage, /String\(candidate\.author\?\.id\) !== String\(work\.value\.author\?\.id\)/);
});
