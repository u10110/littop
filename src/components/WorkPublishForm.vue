<script setup>
import { ref } from 'vue';

import { apolloClient } from '../lib/apollo.js';
import { CREATE_WORK_MUTATION } from '../lib/graphql.js';

const emit = defineEmits(['created']);

const createBusy = ref(false);
const createStatus = ref('');
const createError = ref('');
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

function normalizeOptional(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

async function submitCreateWork() {
  createBusy.value = true;
  createStatus.value = '';
  createError.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_WORK_MUTATION,
      variables: {
        input: {
          sectionCode: createForm.value.sectionCode,
          title: createForm.value.title.trim(),
          summary: normalizeOptional(createForm.value.summary),
          body: normalizeOptional(createForm.value.body),
          excerpt: normalizeOptional(createForm.value.summary),
          projectFormat: createForm.value.sectionCode === 'project' ? normalizeOptional(createForm.value.projectFormat) : null,
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
      Новая публикация теперь создаётся прямо из кабинета автора. После сохранения её можно сразу открыть через ссылку
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

      <button class="btn btn-primary" type="submit" :disabled="createBusy">
        {{ createBusy ? 'Публикуем…' : 'Опубликовать' }}
      </button>
      <div v-if="createStatus" class="message success">{{ createStatus }}</div>
      <div v-if="createError" class="message error">{{ createError }}</div>
    </form>
  </article>
</template>
