<script setup>
import { ref } from 'vue';

import { apolloClient } from '../lib/apollo.js';
import { CREATE_WORK_MUTATION } from '../lib/graphql.js';
import { getWorkMediaMeta, uploadWorkMedia } from '../lib/workMedia.js';

const emit = defineEmits(['created']);

const createBusy = ref(false);
const createStatus = ref('');
const createError = ref('');
const pdfInput = ref(null);
const audioInput = ref(null);
const selectedPdfFile = ref(null);
const selectedAudioFile = ref(null);
const uploadedPdf = ref({ url: '', fileName: '' });
const uploadedAudio = ref({ url: '', fileName: '' });
const createForm = ref({
  sectionCode: 'poetry',
  title: '',
  summary: '',
  body: '',
  projectFormat: '',
});

const projectFormats = [
  { value: '', label: 'Без уточнения' },
  { value: 'song', label: 'Песня' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'stage_production', label: 'Постановка' },
  { value: 'screenplay', label: 'Киносценарий' },
  { value: 'other', label: 'Другое' },
];

const pdfMeta = getWorkMediaMeta('pdf');
const audioMeta = getWorkMediaMeta('audio');

function normalizeOptional(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function buildExcerpt(summary, body) {
  const preferred = normalizeOptional(summary);
  if (preferred) return preferred;
  const normalizedBody = normalizeOptional(body);
  if (!normalizedBody) return null;
  return normalizedBody.slice(0, 280);
}

function resetAttachedFiles() {
  selectedPdfFile.value = null;
  selectedAudioFile.value = null;
  uploadedPdf.value = { url: '', fileName: '' };
  uploadedAudio.value = { url: '', fileName: '' };
  if (pdfInput.value) pdfInput.value.value = '';
  if (audioInput.value) audioInput.value.value = '';
}

function handlePdfChange(event) {
  selectedPdfFile.value = event?.target?.files?.[0] ?? null;
  uploadedPdf.value = { url: '', fileName: '' };
}

function handleAudioChange(event) {
  selectedAudioFile.value = event?.target?.files?.[0] ?? null;
  uploadedAudio.value = { url: '', fileName: '' };
}

async function ensureUploadedAsset(kind, selectedFileRef, uploadedRef) {
  if (!selectedFileRef.value) {
    return uploadedRef.value;
  }
  const uploaded = await uploadWorkMedia({ kind, file: selectedFileRef.value });
  uploadedRef.value = uploaded;
  selectedFileRef.value = null;
  return uploaded;
}

async function submitCreateWork() {
  createBusy.value = true;
  createStatus.value = '';
  createError.value = '';

  try {
    const [pdfAsset, audioAsset] = await Promise.all([
      ensureUploadedAsset('pdf', selectedPdfFile, uploadedPdf),
      ensureUploadedAsset('audio', selectedAudioFile, uploadedAudio),
    ]);

    const { data } = await apolloClient.mutate({
      mutation: CREATE_WORK_MUTATION,
      variables: {
        input: {
          sectionCode: createForm.value.sectionCode,
          title: createForm.value.title.trim(),
          summary: normalizeOptional(createForm.value.summary),
          body: normalizeOptional(createForm.value.body),
          excerpt: buildExcerpt(createForm.value.summary, createForm.value.body),
          projectFormat: createForm.value.sectionCode === 'project' ? normalizeOptional(createForm.value.projectFormat) : null,
          pdfUrl: normalizeOptional(pdfAsset?.url),
          pdfFileName: normalizeOptional(pdfAsset?.fileName),
          audioUrl: normalizeOptional(audioAsset?.url),
          audioFileName: normalizeOptional(audioAsset?.fileName),
        },
      },
    });

    const createdWork = data?.createWork ?? null;
    createForm.value = {
      sectionCode: 'poetry',
      title: '',
      summary: '',
      body: '',
      projectFormat: '',
    };
    resetAttachedFiles();
    createStatus.value = 'Произведение опубликовано.';
    emit('created', createdWork);
  } catch (mutationError) {
    createError.value = mutationError.message;
  } finally {
    createBusy.value = false;
  }
}
</script>

<template>
  <article class="panel stack">
    <div class="section-head">
      <h2>Новая публикация</h2>
      <span class="pill good">mutation createWork</span>
    </div>

    <div class="note">
      Теперь к произведению можно сразу прикрепить PDF и аудиофайл. После сохранения публикацию можно открыть через ссылку
      «Мои произведения».
    </div>

    <form class="stack" @submit.prevent="submitCreateWork">
      <div class="field">
        <label for="create-section">Раздел</label>
        <select id="create-section" v-model="createForm.sectionCode" class="select">
          <option value="poetry">Поэзия</option>
          <option value="prose">Проза</option>
          <option value="project">Творческий проект</option>
        </select>
      </div>

      <div v-if="createForm.sectionCode === 'project'" class="field">
        <label for="create-project-format">Формат проекта</label>
        <select id="create-project-format" v-model="createForm.projectFormat" class="select">
          <option v-for="option in projectFormats" :key="option.value || 'default'" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div class="field">
        <label for="create-title">Заголовок</label>
        <input id="create-title" v-model="createForm.title" class="input" required />
      </div>

      <div class="field">
        <label for="create-summary">Краткое описание</label>
        <textarea id="create-summary" v-model="createForm.summary" class="textarea" placeholder="2–3 предложения о публикации" />
      </div>

      <div class="field">
        <label for="create-body">Текст</label>
        <textarea id="create-body" v-model="createForm.body" class="textarea" placeholder="Полный текст произведения" />
      </div>

      <div class="media-upload-grid">
        <div class="field media-upload-card">
          <label for="create-pdf">PDF-файл</label>
          <input
            id="create-pdf"
            ref="pdfInput"
            class="input"
            type="file"
            :accept="pdfMeta.accept"
            @change="handlePdfChange"
          />
          <div class="meta">Подходит для рукописи, презентации или приложения к произведению.</div>
          <div v-if="selectedPdfFile" class="pill">Выбран: {{ selectedPdfFile.name }}</div>
          <div v-else-if="uploadedPdf.fileName" class="pill good">Загружен: {{ uploadedPdf.fileName }}</div>
        </div>

        <div class="field media-upload-card">
          <label for="create-audio">Аудиофайл</label>
          <input
            id="create-audio"
            ref="audioInput"
            class="input"
            type="file"
            :accept="audioMeta.accept"
            @change="handleAudioChange"
          />
          <div class="meta">Можно приложить чтение, песню, демо или озвучку произведения.</div>
          <div v-if="selectedAudioFile" class="pill">Выбран: {{ selectedAudioFile.name }}</div>
          <div v-else-if="uploadedAudio.fileName" class="pill good">Загружен: {{ uploadedAudio.fileName }}</div>
        </div>
      </div>

      <button class="btn btn-primary" type="submit" :disabled="createBusy">
        {{ createBusy ? 'Публикуем…' : 'Опубликовать' }}
      </button>
      <div v-if="createStatus" class="message success">{{ createStatus }}</div>
      <div v-if="createError" class="message error">{{ createError }}</div>
    </form>
  </article>
</template>
