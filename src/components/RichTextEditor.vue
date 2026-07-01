<script setup>
import { computed, onMounted, ref, watch } from 'vue';

import { isRichTextEmpty, sanitizeRichTextHtml } from '../lib/richText.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Введите текст',
  },
  label: {
    type: String,
    default: 'Текст',
  },
  editorId: {
    type: String,
    default: 'rich-text-editor',
  },
});

const emit = defineEmits(['update:modelValue']);
const editorRef = ref(null);
const fontFamily = ref('inherit');
const fontSize = ref('3');

const fontOptions = [
  { value: 'inherit', label: 'Шрифт по умолчанию' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
];

const sizeOptions = [
  { value: '2', label: 'Мелкий' },
  { value: '3', label: 'Обычный' },
  { value: '4', label: 'Средний' },
  { value: '5', label: 'Крупный' },
  { value: '6', label: 'Очень крупный' },
];

const htmlValue = computed(() => sanitizeRichTextHtml(props.modelValue));

function syncEditorHtml(html) {
  if (!editorRef.value) return;
  const normalized = sanitizeRichTextHtml(html);
  if (editorRef.value.innerHTML !== normalized) {
    editorRef.value.innerHTML = normalized;
  }
}

function emitCurrentHtml() {
  if (!editorRef.value) return;
  const normalized = sanitizeRichTextHtml(editorRef.value.innerHTML);
  emit('update:modelValue', normalized);
}

function ensureParagraph() {
  if (!editorRef.value) return;
  if (isRichTextEmpty(editorRef.value.innerHTML)) {
    editorRef.value.innerHTML = '<p></p>';
    emitCurrentHtml();
  }
}

function focusEditor() {
  editorRef.value?.focus?.();
}

function runCommand(command, value = null) {
  focusEditor();
  document.execCommand(command, false, value);
  emitCurrentHtml();
}

function setFontFamily(value) {
  fontFamily.value = value;
  if (value === 'inherit') {
    runCommand('removeFormat');
    return;
  }
  runCommand('fontName', value);
}

function setFontSize(value) {
  fontSize.value = value;
  runCommand('fontSize', value);
}

function clearFormatting() {
  runCommand('removeFormat');
}

watch(() => props.modelValue, (next) => {
  syncEditorHtml(next);
}, { immediate: true });

onMounted(() => {
  syncEditorHtml(props.modelValue);
  ensureParagraph();
});
</script>

<template>
  <div class="stack rich-text-editor-wrap">
    <div class="field">
      <label :for="editorId">{{ label }}</label>
      <div class="rich-text-toolbar">
        <select class="select rich-text-select" :value="fontFamily" @change="setFontFamily($event.target.value)">
          <option v-for="option in fontOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select class="select rich-text-select" :value="fontSize" @change="setFontSize($event.target.value)">
          <option v-for="option in sizeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button class="btn btn-outline btn-sm" type="button" @click="runCommand('bold')"><strong>B</strong></button>
        <button class="btn btn-outline btn-sm" type="button" @click="runCommand('italic')"><em>I</em></button>
        <button class="btn btn-outline btn-sm" type="button" @click="runCommand('underline')"><u>U</u></button>
        <button class="btn btn-outline btn-sm" type="button" @click="runCommand('insertUnorderedList')">• список</button>
        <button class="btn btn-outline btn-sm" type="button" @click="runCommand('formatBlock', '<blockquote>')">цитата</button>
        <button class="btn btn-outline btn-sm" type="button" @click="clearFormatting">сброс</button>
      </div>
      <div
        :id="editorId"
        ref="editorRef"
        class="input rich-text-surface"
        contenteditable="true"
        :data-placeholder="placeholder"
        @input="emitCurrentHtml"
        @blur="emitCurrentHtml"
      />
    </div>
  </div>
</template>
