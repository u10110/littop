<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { normalizeHtmlSource, normalizeRichTextHtml } from '../lib/richText.js';
import { richTextExtensions } from '../lib/editorExtensions.js';
import { uploadWorkImage } from '../lib/workMedia.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Введите полный текст произведения' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const textColorInput = ref(null);
const highlightColorInput = ref(null);
const imageFileInput = ref(null);
const fontFamily = ref('');
const fontSize = ref('');
const htmlMode = ref(false);
const htmlSource = ref('');
const imageUploadBusy = ref(false);
const imageUploadError = ref('');

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: richTextExtensions,
  editorProps: { attributes: { class: 'rich-text-content', 'aria-label': 'Текст произведения' } },
  onUpdate: ({ editor: currentEditor }) => emit('update:modelValue', normalizeRichTextHtml(currentEditor.getHTML())),
});

const isEmpty = computed(() => !normalizeRichTextHtml(editor.value?.getHTML()));
watch(() => props.modelValue, (value) => {
  if (!editor.value || value === editor.value.getHTML()) return;
  editor.value.commands.setContent(value || '<p></p>', { emitUpdate: false });
});
watch(() => props.disabled, (value) => editor.value?.setEditable(!value));
onBeforeUnmount(() => editor.value?.destroy());

function run(command) { if (!editor.value || props.disabled) return; command(editor.value.chain().focus()); }
function toggleHtmlMode() {
  if (!editor.value || props.disabled) return;
  if (!htmlMode.value) {
    htmlSource.value = editor.value.getHTML();
    htmlMode.value = true;
    return;
  }
  const html = normalizeHtmlSource(htmlSource.value);
  editor.value.commands.setContent(html, { emitUpdate: false });
  emit('update:modelValue', normalizeRichTextHtml(editor.value.getHTML()));
  htmlMode.value = false;
}
function setLink() {
  if (!editor.value || props.disabled) return;
  const previousUrl = editor.value.getAttributes('link').href || '';
  const url = window.prompt('Ссылка', previousUrl);
  if (url === null) return;
  if (!url.trim()) editor.value.chain().focus().unsetLink().run();
  else editor.value.chain().focus().setLink({ href: url.trim(), target: '_blank', rel: 'noopener noreferrer' }).run();
}
function setImage() {
  if (!editor.value || props.disabled) return;
  const url = window.prompt('Адрес изображения');
  if (url?.trim()) editor.value.chain().focus().setImage({ src: url.trim(), alt: '' }).run();
}
function chooseImage() {
  if (props.disabled || imageUploadBusy.value) return;
  imageUploadError.value = '';
  imageFileInput.value?.click();
}
async function uploadAndInsertImage(event) {
  const input = event.target;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !editor.value) return;
  imageUploadBusy.value = true;
  imageUploadError.value = '';
  try {
    const imageUrl = await uploadWorkImage({ file });
    editor.value.chain().focus().setImage({ src: imageUrl, alt: file.name.replace(/\.[^.]+$/, '') }).run();
  } catch (error) {
    imageUploadError.value = error instanceof Error ? error.message : 'Не удалось загрузить изображение.';
  } finally {
    imageUploadBusy.value = false;
  }
}
function applyTextColor(event) { run((chain) => chain.setColor(event.target.value)); }
function applyHighlightColor(event) { run((chain) => chain.setHighlight({ color: event.target.value })); }
function applyFontFamily(event) { const value = event.target.value; fontFamily.value = value; if (value) run((chain) => chain.setFontFamily(value)); else run((chain) => chain.unsetFontFamily()); }
function applyFontSize(event) { const value = event.target.value; fontSize.value = value; if (value) run((chain) => chain.setFontSize(value)); else run((chain) => chain.unsetFontSize()); }
</script>

<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <div v-if="editor" class="rich-text-toolbar" role="toolbar" aria-label="Форматирование текста">
      <div class="tool-group"><button type="button" title="Режим HTML" :class="{ active: htmlMode }" @mousedown.prevent @click="toggleHtmlMode">&lt;/&gt;</button></div>
      <div class="tool-group"><button type="button" title="Жирный" :class="{ active: editor.isActive('bold') }" @mousedown.prevent @click="run((chain) => chain.toggleBold().run())"><b>B</b></button><button type="button" title="Курсив" :class="{ active: editor.isActive('italic') }" @mousedown.prevent @click="run((chain) => chain.toggleItalic().run())"><i>I</i></button><button type="button" title="Подчёркивание" :class="{ active: editor.isActive('underline') }" @mousedown.prevent @click="run((chain) => chain.toggleUnderline().run())"><u>U</u></button><button type="button" title="Зачёркивание" :class="{ active: editor.isActive('strike') }" @mousedown.prevent @click="run((chain) => chain.toggleStrike().run())"><s>T</s></button></div>
      <div class="tool-group"><button type="button" title="Маркированный список" :class="{ active: editor.isActive('bulletList') }" @mousedown.prevent @click="run((chain) => chain.toggleBulletList().run())">•≡</button><button type="button" title="Нумерованный список" :class="{ active: editor.isActive('orderedList') }" @mousedown.prevent @click="run((chain) => chain.toggleOrderedList().run())">1≡</button></div>
      <div class="tool-group"><button type="button" :title="imageUploadBusy ? 'Загружаем изображение…' : 'Загрузить изображение'" :disabled="imageUploadBusy" @mousedown.prevent @click="chooseImage">{{ imageUploadBusy ? '…' : '▧' }}</button><input ref="imageFileInput" class="file-control" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="uploadAndInsertImage"><button type="button" title="Вставить изображение по ссылке" @mousedown.prevent @click="setImage">▧⌁</button><button type="button" title="Вставить ссылку" :class="{ active: editor.isActive('link') }" @mousedown.prevent @click="setLink">⌁</button></div>
      <div class="tool-group"><button type="button" title="Выровнять по левому краю" :class="{ active: editor.isActive({ textAlign: 'left' }) }" @mousedown.prevent @click="run((chain) => chain.setTextAlign('left').run())">≡</button></div>
      <div class="tool-group"><button type="button" title="Горизонтальная линия" @mousedown.prevent @click="run((chain) => chain.setHorizontalRule().run())">—</button></div>
      <div class="tool-group typography-tools"><button type="button" title="Цвет текста" @mousedown.prevent @click="textColorInput?.click()"><span class="text-color-icon">A</span></button><input ref="textColorInput" class="color-control" type="color" value="#1f2933" @input="applyTextColor"><button type="button" title="Цвет фона" @mousedown.prevent @click="highlightColorInput?.click()"><span class="highlight-color-icon">A</span></button><input ref="highlightColorInput" class="color-control" type="color" value="#fff176" @input="applyHighlightColor"><label title="Шрифт" class="tool-select"><span>Aa</span><select v-model="fontFamily" @change="applyFontFamily"><option value="">Шрифт</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option><option value="'Courier New'">Courier New</option><option value="'Times New Roman'">Times New Roman</option></select></label><label title="Размер текста" class="tool-select"><span>a↕</span><select v-model="fontSize" @change="applyFontSize"><option value="">Размер</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option></select></label></div>
    </div>
    <textarea v-if="htmlMode" v-model="htmlSource" class="html-source" aria-label="HTML исходник" spellcheck="false" />
    <template v-else><EditorContent :editor="editor" /><span v-if="isEmpty" class="editor-placeholder">{{ placeholder }}</span></template>
    <p v-if="imageUploadError" class="image-upload-error" role="alert">{{ imageUploadError }}</p>
  </div>
</template>

<style scoped>
.rich-text-editor { position: relative; border: 1px solid #cbd2d8; border-radius: 3px; background: #fffdf8; overflow: hidden; }
.rich-text-toolbar { min-height: 37px; display: flex; align-items: stretch; flex-wrap: wrap; background: linear-gradient(#f6f7f8, #e9edf0); border-bottom: 1px solid #cbd2d8; }
.tool-group { display: flex; align-items: center; padding: 3px 5px; border-right: 1px solid #c4cbd1; }
.tool-group:last-child { border-right: 0; }
button { border: 0; background: transparent; min-width: 27px; height: 27px; padding: 0 5px; color: #252b30; font: 16px/1 Georgia, serif; cursor: pointer; border-radius: 2px; }
button:hover, button.active { background: #d9e2ea; }
.typography-tools button { font-family: Arial, sans-serif; }
.text-color-icon { border-bottom: 3px solid #273849; padding-bottom: 1px; }
.highlight-color-icon { display: inline-block; padding: 2px 3px; background: #d9dadd; }
.color-control { display: none; }
.file-control { display: none; }
.tool-select { position: relative; display: inline-flex; align-items: center; justify-content: center; min-width: 29px; height: 27px; font: 15px/1 Arial, sans-serif; cursor: pointer; }
.tool-select select { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
:deep(.rich-text-content) { min-height: 300px; padding: 15px 16px; outline: none; font: 18px/1.65 Georgia, 'Times New Roman', serif; color: #27211c; white-space: pre-wrap; }
:deep(.rich-text-content p) { margin: 0 0 1em; }
:deep(.rich-text-content p:last-child) { margin-bottom: 0; }
:deep(.rich-text-content img) { max-width: 100%; height: auto; margin: 1rem 0; }
:deep(.rich-text-content [data-resize-wrapper]) { display: inline-block !important; }
:deep(.rich-text-content [data-resize-handle]) { width: 14px; height: 14px; box-sizing: border-box; border: 2px solid #2d668f; border-radius: 2px; background: #fff; z-index: 3; touch-action: none; }
:deep(.rich-text-content [data-resize-handle="top-left"]) { transform: translate(-50%, -50%); cursor: nwse-resize; }
:deep(.rich-text-content [data-resize-handle="bottom-right"]) { transform: translate(50%, 50%); cursor: se-resize; }
:deep(.rich-text-content [data-resize-handle="top-right"]) { transform: translate(50%, -50%); cursor: nesw-resize; }
:deep(.rich-text-content [data-resize-handle="bottom-left"]) { transform: translate(-50%, 50%); cursor: nesw-resize; }
:deep(.rich-text-content [data-resize-container][data-resize-state="true"] img) { outline: 1px solid #2d668f; outline-offset: 2px; }
:deep(.rich-text-content hr) { border: 0; border-top: 1px solid #aeb6bd; margin: 1.4rem 0; }
.html-source { display: block; width: 100%; min-height: 300px; box-sizing: border-box; padding: 15px 16px; border: 0; outline: 0; resize: vertical; font: 14px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; color: #27211c; background: #fffdf8; }
.image-upload-error { margin: 0; padding: 7px 12px; border-top: 1px solid #edc1c1; color: #a02c2c; background: #fff2f2; font-size: 13px; }
.editor-placeholder { position: absolute; top: 54px; left: 16px; color: #8e9498; pointer-events: none; font: 18px Georgia, serif; }
.is-disabled { opacity: .65; }
.is-disabled button, .is-disabled .tool-select { cursor: not-allowed; }
@media (max-width: 680px) { .tool-group { padding: 2px; } button { min-width: 25px; } :deep(.rich-text-content) { min-height: 240px; padding: 12px; font-size: 17px; } }
</style>
