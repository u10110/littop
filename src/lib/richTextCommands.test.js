import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { richTextExtensions } from './editorExtensions.js';
import { normalizeHtmlSource } from './richText.js';
import { normalizeVideoEmbedUrl } from './videoEmbeds.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.getSelection = dom.window.getSelection.bind(dom.window);

function editorWithText() {
  return new Editor({ extensions: richTextExtensions, content: '<p>Тестовый текст</p>' });
}

test('rich-text commands apply every mark and typography format to the selected text', () => {
  const cases = [
    ['bold', (editor) => editor.chain().selectAll().toggleBold().run(), /<strong>Тестовый текст<\/strong>/],
    ['italic', (editor) => editor.chain().selectAll().toggleItalic().run(), /<em>Тестовый текст<\/em>/],
    ['underline', (editor) => editor.chain().selectAll().toggleUnderline().run(), /<u>Тестовый текст<\/u>/],
    ['strike', (editor) => editor.chain().selectAll().toggleStrike().run(), /<s>Тестовый текст<\/s>/],
    ['text color', (editor) => editor.chain().selectAll().setColor('#ff0000').run(), /color: rgb\(255, 0, 0\)|color: #ff0000/],
    ['highlight', (editor) => editor.chain().selectAll().setHighlight({ color: '#ffff00' }).run(), /background-color: rgb\(255, 255, 0\)|background-color: #ffff00/],
    ['font family', (editor) => editor.chain().selectAll().setFontFamily('Arial').run(), /font-family: Arial/],
    ['font size', (editor) => editor.chain().selectAll().setFontSize('20px').run(), /font-size: 20px/],
  ];
  for (const [label, command, expected] of cases) {
    const editor = editorWithText();
    assert.equal(command(editor), true, label);
    assert.match(editor.getHTML(), expected, label);
    editor.destroy();
  }
});

test('rich-text commands insert lists, link, a resizable image, alignment and horizontal rule', () => {
  const editor = editorWithText();
  assert.equal(editor.chain().selectAll().toggleBulletList().run(), true);
  assert.match(editor.getHTML(), /<ul>/);
  assert.equal(editor.chain().toggleOrderedList().run(), true);
  assert.match(editor.getHTML(), /<ol>/);
  editor.commands.setContent('<p>Ссылка</p>');
  assert.equal(editor.chain().selectAll().setLink({ href: 'https://example.com' }).run(), true);
  assert.match(editor.getHTML(), /href="https:\/\/example.com"/);
  assert.equal(editor.chain().setTextAlign('left').run(), true);
  assert.match(editor.getHTML(), /text-align: left/);
  assert.equal(editor.chain().setImage({ src: 'https://example.com/image.png', alt: 'Обложка', width: 320 }).run(), true);
  assert.match(editor.getHTML(), /<img[^>]+src="https:\/\/example.com\/image.png"/);
  assert.match(editor.getHTML(), /width="320"/);
  assert.equal(editor.chain().setImage({ src: 'https://example.com/linked.png', alt: 'Ссылка-картинка', linkHref: 'https://example.org/page' }).run(), true);
  assert.match(editor.getHTML(), /<a[^>]+href="https:\/\/example.org\/page"[^>]*><img[^>]+src="https:\/\/example.com\/linked.png"/);
  assert.equal(editor.chain().setVideoEmbed({
    src: normalizeVideoEmbedUrl('https://rutube.ru/video/0123456789abcdef0123456789abcdef/'),
    width: 480,
    height: 270,
  }).run(), true);
  assert.match(editor.getHTML(), /<iframe[^>]+src="https:\/\/rutube\.ru\/play\/embed\/0123456789abcdef0123456789abcdef"/);
  assert.match(editor.getHTML(), /width="480"/);
  assert.match(editor.getHTML(), /height="270"/);
  assert.equal(editor.chain().setHorizontalRule().run(), true);
  assert.match(editor.getHTML(), /<hr>/);
  editor.destroy();
});

test('image node view enables drag resize with locked aspect ratio', async () => {
  const source = await readFile(new URL('./editorExtensions.js', import.meta.url), 'utf8');
  assert.match(source, /Image\.configure\(\{[\s\S]*resize:\s*\{[\s\S]*enabled:\s*true/);
  assert.match(source, /alwaysPreserveAspectRatio:\s*true/);
  const component = await readFile(new URL('../components/RichTextEditor.vue', import.meta.url), 'utf8');
  assert.match(component, /data-resize-handle\]\)\s*\{[\s\S]*width:\s*14px[\s\S]*height:\s*14px/);
  assert.match(component, /data-resize-handle="bottom-right"\]\)\s*\{[\s\S]*cursor:\s*se-resize/);
});

test('editor uses Littop modal dialogs instead of native prompts and alerts', async () => {
  const component = await readFile(new URL('../components/RichTextEditor.vue', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /window\.(prompt|alert)\s*\(/);
  assert.match(component, /role="dialog"[\s\S]*Вставить/);
  assert.match(component, /@submit\.prevent="submitInsertModal"/);
  assert.match(component, /selection\.node\?\.type\.name === 'image'/);
  assert.match(component, /Ссылка для изображения/);
});

test('work edit form keeps rubric options linked to its selected section', async () => {
  const page = await readFile(new URL('../components/WorkPage.vue', import.meta.url), 'utf8');
  assert.match(page, /WORK_GENRES_QUERY/);
  assert.match(page, /sectionCode: editForm\.value\.sectionCode/);
  assert.match(page, /@change="clearEditGenreForSectionChange"/);
  assert.match(page, /function clearEditGenreForSectionChange\(\)[\s\S]*genreSlug = ''/);
  assert.match(page, /genreSlug: normalizeOptional\(editForm\.value\.genreSlug\)/);
  assert.match(page, /v-for="genre in editGenreOptions"/);
});

test('HTML source helpers switch markup mode without converting it to literal text', () => {
  assert.equal(normalizeHtmlSource('  <p><strong>Текст</strong></p>  '), '<p><strong>Текст</strong></p>');
  assert.equal(normalizeHtmlSource(''), '<p></p>');
});
