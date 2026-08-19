import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../components/WorkPage.vue', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../assets/littop-reference.css', import.meta.url), 'utf8');

test('work page shows the complete authored text inline without a reader dialog', () => {
  assert.match(source, /class="excerpt work-full-text"/);
  assert.match(source, /\{\{ formattedWorkBody \}\}/);
  assert.doesNotMatch(source, /readerDialog|openReader|book-reader|Читать полностью/);
  assert.match(styles, /\.work-full-text\s*\{[\s\S]*white-space:\s*pre-wrap/);
});
