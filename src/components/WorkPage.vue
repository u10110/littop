<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import WorkDiscussionPanel from './WorkDiscussionPanel.vue';
import { apolloClient } from '../lib/apollo.js';
import {
  DELETE_WORK_MUTATION,
  UPDATE_WORK_MUTATION,
  WORK_QUERY,
} from '../lib/graphql.js';
import { formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { getAuthorDisplayName } from '../lib/forum.js';
import { buildAuthorPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const {
  bootstrapSession,
  currentUser,
} = useSession();

const work = ref(null);
const workLoading = ref(false);
const workError = ref('');
const editMode = ref(false);
const editBusy = ref(false);
const editStatus = ref('');
const deleteBusy = ref(false);
const deleteStatus = ref('');
const editForm = ref({
  sectionCode: 'poetry',
  title: '',
  summary: '',
  body: '',
  projectFormat: '',
});
let workRequestVersion = 0;

const projectFormats = [
  { value: '', label: 'Без уточнения' },
  { value: 'song', label: 'Песня' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'stage_production', label: 'Постановка' },
  { value: 'screenplay', label: 'Киносценарий' },
  { value: 'other', label: 'Другое' },
];

const slugOrId = computed(() => normalizeRouteParam(route.params.slugOrId));
const notFound = computed(() => !workLoading.value && !workError.value && Boolean(slugOrId.value) && !work.value);
const isOwner = computed(() => {
  if (!currentUser.value?.id || !work.value?.author?.id) {
    return false;
  }
  return String(currentUser.value.id) === String(work.value.author.id);
});

onMounted(() => {
  bootstrapSession();
});

watch(slugOrId, (value) => {
  loadWorkPage(value);
}, { immediate: true });

watch(work, (value) => {
  if (value && !editMode.value) {
    syncEditForm(value);
  }
}, { immediate: true });

function currentLookupVariables(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { id: null, slug: null };
  }
  if (/^\d+$/.test(normalized)) {
    return { id: normalized, slug: null };
  }
  return { id: null, slug: normalized };
}

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function syncEditForm(sourceWork = work.value) {
  editForm.value = {
    sectionCode: sourceWork?.sectionCode || 'poetry',
    title: sourceWork?.title || '',
    summary: sourceWork?.summary || sourceWork?.excerpt || '',
    body: sourceWork?.body || '',
    projectFormat: sourceWork?.projectFormat || '',
  };
}

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

function startEditing() {
  syncEditForm();
  editStatus.value = '';
  deleteStatus.value = '';
  editMode.value = true;
}

function cancelEditing() {
  syncEditForm();
  editStatus.value = '';
  editMode.value = false;
}

async function loadWorkPage(value) {
  const requestVersion = workRequestVersion + 1;
  workRequestVersion = requestVersion;
  work.value = null;
  workError.value = '';
  editStatus.value = '';
  deleteStatus.value = '';
  editMode.value = false;

  if (!value) {
    return;
  }

  await fetchWork(value, requestVersion);
}

async function fetchWork(value, requestVersion = workRequestVersion) {
  workLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: WORK_QUERY,
      variables: currentLookupVariables(value),
      fetchPolicy: 'network-only',
    });

    if (requestVersion !== workRequestVersion) {
      return null;
    }

    work.value = data?.work ?? null;
    return work.value;
  } catch (queryError) {
    if (requestVersion === workRequestVersion) {
      work.value = null;
      workError.value = queryError.message;
    }
    return null;
  } finally {
    if (requestVersion === workRequestVersion) {
      workLoading.value = false;
    }
  }
}

async function refreshCurrentWork() {
  if (!slugOrId.value) {
    return;
  }
  await fetchWork(slugOrId.value);
}

async function submitWorkUpdate() {
  if (!work.value) return;
  editBusy.value = true;
  editStatus.value = '';
  deleteStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: UPDATE_WORK_MUTATION,
      variables: {
        workId: work.value.id,
        input: {
          sectionCode: editForm.value.sectionCode,
          title: editForm.value.title.trim(),
          summary: normalizeOptional(editForm.value.summary),
          body: normalizeOptional(editForm.value.body),
          excerpt: buildExcerpt(editForm.value.summary, editForm.value.body),
          projectFormat: editForm.value.sectionCode === 'project' ? normalizeOptional(editForm.value.projectFormat) : null,
        },
      },
    });
    editMode.value = false;
    editStatus.value = 'Изменения сохранены.';
    await refreshCurrentWork();
  } catch (mutationError) {
    editStatus.value = mutationError.message;
  } finally {
    editBusy.value = false;
  }
}

async function softDeleteCurrentWork() {
  if (!work.value) return;
  const confirmed = globalThis.confirm?.('Убрать произведение в архив? Удаление будет мягким — через статус archived.') ?? true;
  if (!confirmed) {
    return;
  }

  deleteBusy.value = true;
  deleteStatus.value = '';
  editStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_WORK_MUTATION,
      variables: {
        workId: work.value.id,
      },
    });
    deleteStatus.value = 'Произведение убрано в архив.';
    editMode.value = false;
    await refreshCurrentWork();
  } catch (mutationError) {
    deleteStatus.value = mutationError.message;
  } finally {
    deleteBusy.value = false;
  }
}
</script>

<template>
  <main class="detail-shell">
    <RouterLink class="detail-back" to="/works">← Вернуться к каталогу</RouterLink>
    <p v-if="workError" class="ref-error">{{ workError }}</p>
    <section v-else-if="workLoading" class="detail-loading">Загружаем произведение…</section>
    <section v-else-if="notFound" class="detail-loading">Произведение не найдено.</section>
    <section v-else-if="work" class="detail-main">
      <article class="detail-content"><header class="work-head"><span>{{ formatWorkSection(work.sectionCode) }}</span><h1>{{ work.title }}</h1><RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)">{{ authorLabel(work.author) }}</RouterLink><p>{{ formatDate(work.publishedAt || work.createdAt) }} · ◉ {{ work.viewsCount || 0 }} · ♡ {{ work.likesCount || 0 }} · 💬 {{ work.commentsCount }}</p></header>
        <div class="work-actions"><span>★ {{ ratingLabel(work.averageRating, work.ratingsCount) }}</span><RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)">Страница автора</RouterLink><button v-if="isOwner" type="button" @click="editMode ? cancelEditing() : startEditing()">{{ editMode ? 'Отменить' : 'Редактировать' }}</button><button v-if="isOwner" type="button" :disabled="deleteBusy" @click="softDeleteCurrentWork">{{ deleteBusy ? 'Архивируем…' : 'Удалить' }}</button></div>
        <p v-if="editStatus" class="ref-error">{{ editStatus }}</p><p v-if="deleteStatus" class="ref-error">{{ deleteStatus }}</p>
        <form v-if="editMode && isOwner" class="work-edit-form" @submit.prevent="submitWorkUpdate"><label>Раздел<select v-model="editForm.sectionCode"><option value="poetry">Поэзия</option><option value="prose">Проза</option><option value="project">Творческий проект</option></select></label><label>Заголовок<input v-model="editForm.title" required></label><label>Краткое описание<textarea v-model="editForm.summary"/></label><label>Текст<textarea v-model="editForm.body"/></label><button type="submit" :disabled="editBusy">{{ editBusy ? 'Сохраняем…' : 'Сохранить' }}</button></form>
        <div v-else class="work-text">{{ work.body || work.summary || work.excerpt || 'Текст пока не добавлен.' }}</div>
        <WorkDiscussionPanel :work="work" @refresh="refreshCurrentWork" />
      </article>
      <aside class="detail-side"><div class="detail-cover"><span>{{ String(work.title || 'L').slice(0,1).toUpperCase() }}</span><small>{{ formatWorkSection(work.sectionCode) }}</small></div><div class="work-info"><h2>О произведении</h2><p>{{ work.summary || work.excerpt || 'Аннотация пока не добавлена.' }}</p><dl><dt>Раздел</dt><dd>{{ formatWorkSection(work.sectionCode) }}</dd><dt>Рейтинг</dt><dd>{{ ratingLabel(work.averageRating, work.ratingsCount) }}</dd><dt>Опубликовано</dt><dd>{{ formatDate(work.publishedAt || work.createdAt) }}</dd></dl></div></aside>
    </section>
  </main>
</template>
