import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { richTextExtensions } from './editorExtensions.js';
import { normalizeHtmlSource } from './richText.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Node = dom.window.Node;
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

test('rich-text commands insert lists, link, image, alignment and horizontal rule', () => {
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
  assert.equal(editor.chain().setImage({ src: 'https://example.com/image.png', alt: 'Обложка' }).run(), true);
  assert.match(editor.getHTML(), /<img[^>]+src="https:\/\/example.com\/image.png"/);
  assert.equal(editor.chain().setHorizontalRule().run(), true);
  assert.match(editor.getHTML(), /<hr>/);
  editor.destroy();
});

test('HTML source helpers switch markup mode without converting it to literal text', () => {
  assert.equal(normalizeHtmlSource('  <p><strong>Текст</strong></p>  '), '<p><strong>Текст</strong></p>');
  assert.equal(normalizeHtmlSource(''), '<p></p>');
});
