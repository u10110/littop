<script setup>
import { computed, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';

import { apolloClient } from '../lib/apollo.js';
import { CREATE_WORK_MUTATION, WORK_GENRES_QUERY } from '../lib/graphql.js';
import RichTextEditor from './RichTextEditor.vue';

const emit = defineEmits(['created']);

const createBusy = ref(false);
const createStatus = ref('');
const createError = ref('');
const createForm = ref({
  sectionCode: 'poetry',
  genreSlug: '',
  title: '',
  summary: '',
  body: '',
  projectFormat: '',
});

const genreQueryVariables = computed(() => ({ sectionCode: createForm.value.sectionCode || null }));
const { result: genresResult, loading: genresLoading } = useQuery(
  WORK_GENRES_QUERY,
  genreQueryVariables,
  { fetchPolicy: 'cache-and-network' },
);
const genreOptions = computed(() => genresResult.value?.workGenres ?? []);

watch(() => createForm.value.sectionCode, () => {
  createForm.value.genreSlug = '';
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
          genreSlug: normalizeOptional(createForm.value.genreSlug),
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
      genreSlug: '',
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
  <article class="panel work-publish-form">
    <div class="section-head">
      <div><span class="publish-kicker">Новая публикация</span><h2>Добавьте произведение</h2></div>
    </div>
    <p class="publish-hint">Заполните основные данные — произведение сразу появится в вашем кабинете.</p>

    <form @submit.prevent="submitCreateWork">
      <div class="publish-classification">
        <div class="field">
          <label for="create-section">Раздел</label>
        <select id="create-section" v-model="createForm.sectionCode" class="select">
          <option value="poetry">Поэзия</option>
          <option value="prose">Проза</option>
          <option value="project">Творческий проект</option>
        </select>
        </div>

        <div class="field">
          <label for="create-genre">Рубрикатор</label>
          <select id="create-genre" v-model="createForm.genreSlug" class="select" :disabled="genresLoading">
            <option value="">{{ genresLoading ? 'Загружаем рубрики…' : 'Не выбирать рубрику' }}</option>
            <option v-for="genre in genreOptions" :key="genre.slug" :value="genre.slug">{{ genre.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="createForm.sectionCode === 'project'" class="field">
        <label for="create-project-format">Формат проекта</label>
        <select id="create-project-format" v-model="createForm.projectFormat" class="select">
          <option v-for="option in projectFormats" :key="option.value || 'default'" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div class="field">
        <label for="create-title">Название произведения</label>
        <input id="create-title" v-model="createForm.title" class="input" required />
      </div>

      <div class="field">
        <label for="create-summary">Анонс произведения <small>(необязательно)</small></label>
        <textarea id="create-summary" v-model="createForm.summary" class="textarea" rows="4" placeholder="Коротко расскажите о произведении" />
      </div>

      <div class="field">
        <label for="create-body">Текст произведения <small>* Перенос строки — Shift+Enter</small></label>
        <RichTextEditor v-model="createForm.body" placeholder="Введите полный текст произведения" :disabled="createBusy" />
      </div>

      <div class="publish-submit"><button class="btn btn-primary" type="submit" :disabled="createBusy">{{ createBusy ? 'Публикуем…' : 'Опубликовать произведение' }}</button><span>После публикации можно отредактировать текст в кабинете.</span></div>
      <div v-if="createStatus" class="message success">{{ createStatus }}</div>
      <div v-if="createError" class="message error">{{ createError }}</div>
    </form>
  </article>
</template>
