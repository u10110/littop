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
  if (!confirmed) return;
  deleteBusy.value = true;
  deleteStatus.value = '';
  editStatus.value = '';
  try {
    await apolloClient.mutate({ mutation: DELETE_WORK_MUTATION, variables: { workId: work.value.id } });
    deleteStatus.value = 'Произведение убрано в архив.';
    editMode.value = false;
    await refreshCurrentWork();
  } catch (mutationError) {
    deleteStatus.value = mutationError.message;
  } finally {
    deleteBusy.value = false;
  }
}

function plainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const readingText = computed(() => plainText(work.value?.body || work.value?.summary || work.value?.excerpt || 'Текст пока не добавлен.'));
const readingParagraphs = computed(() => readingText.value.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean));
const previewParagraphs = computed(() => {
  const paragraphs = readingParagraphs.value.slice(0, 2);
  return paragraphs.length > 1 ? paragraphs : [...paragraphs, 'Откройте читалку, чтобы прочитать произведение целиком.'];
});
const readerDialog = ref(null);
const shareStatus = ref('');
function openReader() { readerDialog.value?.showModal?.(); }
function closeReader() { readerDialog.value?.close?.(); }
async function shareWork() {
  const url = window.location.href;
  const data = { title: work.value?.title || 'Произведение на Littop', text: work.value?.summary || work.value?.excerpt || '', url };
  try {
    if (navigator.share) {
      await navigator.share(data);
      shareStatus.value = 'Ссылка отправлена.';
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      shareStatus.value = 'Ссылка скопирована.';
    } else {
      shareStatus.value = url;
    }
  } catch (error) {
    if (error?.name !== 'AbortError') shareStatus.value = 'Не удалось поделиться ссылкой.';
  }
}
</script>

<template>
  <main class="detail-ref">
    <div class="detail-shell">
      <section class="detail-main">
        <p v-if="workError" class="ref-error">{{ workError }}</p>
        <section v-else-if="workLoading" class="detail-loading">Загружаем произведение…</section>
        <section v-else-if="notFound" class="detail-loading">Произведение не найдено.</section>
        <template v-else-if="work">
          <div class="crumbs"><RouterLink to="/">Главная</RouterLink> › <RouterLink to="/works">Произведения</RouterLink> › {{ formatWorkSection(work.sectionCode) }}</div>
          <div class="work-head">
            <div class="detail-cover"><span>{{ String(work.title || 'L').slice(0, 1).toUpperCase() }}</span><small>{{ formatWorkSection(work.sectionCode) }}</small></div>
            <div class="work-info">
              <h1>{{ work.title }}</h1>
              <RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)">{{ authorLabel(work.author) }}</RouterLink>
              <p class="genres">{{ formatWorkSection(work.sectionCode) }}</p>
              <p class="dates">Опубликовано: {{ formatDate(work.publishedAt || work.createdAt) }}<br>Обновлено: {{ formatDate(work.updatedAt || work.publishedAt || work.createdAt) }}</p>
              <div class="work-actions"><span>◉ {{ work.viewsCount || 0 }}</span><span>♡ {{ work.likesCount || 0 }}</span><span>★ {{ ratingLabel(work.averageRating, work.ratingsCount) }}</span><button type="button" @click="shareWork">↗ Поделиться⌄</button><button v-if="isOwner" type="button" @click="editMode ? cancelEditing() : startEditing()">{{ editMode ? 'Отменить' : 'Редактировать' }}</button></div>
              <p v-if="shareStatus" class="share-status">{{ shareStatus }}</p>
              <article class="excerpt excerpt-preview"><p v-for="(paragraph, index) in previewParagraphs" :key="index">{{ paragraph }}</p></article>
              <button class="btn btn-primary read-full" type="button" @click="openReader">Читать полностью</button>
            </div>
          </div>
          <form v-if="editMode && isOwner" class="work-edit-form" @submit.prevent="submitWorkUpdate"><label>Раздел<select v-model="editForm.sectionCode"><option value="poetry">Поэзия</option><option value="prose">Проза</option><option value="project">Творческий проект</option></select></label><label>Заголовок<input v-model="editForm.title" required></label><label>Краткое описание<textarea v-model="editForm.summary" /></label><label>Текст<textarea v-model="editForm.body" /></label><button type="submit" :disabled="editBusy">{{ editBusy ? 'Сохраняем…' : 'Сохранить' }}</button><button type="button" :disabled="deleteBusy" @click="softDeleteCurrentWork">{{ deleteBusy ? 'Архивируем…' : 'Удалить' }}</button></form>
          <p v-if="editStatus || deleteStatus" class="ref-error">{{ editStatus || deleteStatus }}</p>
          <WorkDiscussionPanel :work="work" @refresh="refreshCurrentWork" />
          <dialog ref="readerDialog" class="book-reader" :aria-label="`Читалка: ${work.title}`" @click.self="closeReader"><div class="reader-bar"><div><span>{{ work.title }}</span><small>{{ authorLabel(work.author) }}</small></div><button type="button" class="reader-close" aria-label="Закрыть чтение" @click="closeReader">×</button></div><article class="reader-page"><p class="reader-kicker">{{ formatWorkSection(work.sectionCode) }}</p><h1>{{ work.title }}</h1><p v-for="(paragraph, index) in readingParagraphs" :key="index" class="reader-paragraph">{{ paragraph }}</p></article></dialog>
        </template>
      </section>
      <aside v-if="work" class="detail-side"><section class="author-card"><h2>Об авторе</h2><div class="author-top"><div class="author-avatar">{{ authorLabel(work.author).slice(0, 1) }}</div><p><b>{{ authorLabel(work.author) }}</b><span>Автор произведения</span></p></div><div class="author-stats"><b>{{ work.author?.worksCountCached ?? work.author?.worksCount ?? '—' }}<small>произведения</small></b><b>{{ work.author?.followersCount || '—' }}<small>подписчики</small></b><b>{{ ratingLabel(work.averageRating, work.ratingsCount) }}<small>рейтинг</small></b></div><RouterLink v-if="work.author?.login" class="btn btn-primary" :to="buildAuthorPageLocation(work.author)">Страница автора</RouterLink></section><section class="mini-works"><h2>О произведении</h2><p>{{ work.summary || work.excerpt || 'Аннотация пока не добавлена.' }}</p><p class="detail-meta">Комментарии: {{ work.commentsCount || 0 }}</p></section></aside>
    </div>
  </main>
</template>
