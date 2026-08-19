import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRichTextHtml, RICH_TEXT_TOOLBAR_GROUPS } from './richText.js';

test('normalizeRichTextHtml turns an empty rich-text document into an empty value', () => {
  assert.equal(normalizeRichTextHtml('<p></p>'), '');
  assert.equal(normalizeRichTextHtml('<p><br></p>'), '');
});

test('normalizeRichTextHtml preserves authored HTML content', () => {
  assert.equal(normalizeRichTextHtml('<p>Первая строфа<br>Вторая строка</p>'), '<p>Первая строфа<br>Вторая строка</p>');
});

test('rich-text toolbar keeps the screenshot control groups', () => {
  assert.deepEqual(
    RICH_TEXT_TOOLBAR_GROUPS.map((group) => group.id),
    ['code', 'marks', 'lists', 'insert', 'align', 'rule', 'typography'],
  );
  assert.deepEqual(RICH_TEXT_TOOLBAR_GROUPS[1].commands, ['bold', 'italic', 'underline', 'strike']);
  assert.deepEqual(RICH_TEXT_TOOLBAR_GROUPS.at(-1).commands, ['textColor', 'highlight', 'fontFamily', 'fontSize']);
});

test('formatting toolbar preserves the editor selection before a click command runs', async () => {
  const component = await readFile(new URL('../components/RichTextEditor.vue', import.meta.url), 'utf8');
  assert.match(component, /@mousedown\.prevent/);
  for (const command of ['toggleBold', 'toggleItalic', 'toggleUnderline', 'toggleStrike']) {
    assert.match(component, new RegExp(`@mousedown\\.prevent[^>]*@click=\"run\\(\\(chain\\) => chain\\.${command}`));
  }
});
