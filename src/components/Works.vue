<script setup>
import { computed, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';

import { apolloClient } from '../lib/apollo.js';
import {
  ADD_WORK_COMMENT_MUTATION,
  CREATE_WORK_MUTATION,
  RATE_WORK_MUTATION,
  WORK_COMMENTS_QUERY,
  WORKS_QUERY,
} from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { useSession } from '../lib/session.js';

const sectionFilter = ref('');
const search = ref('');
const selectedWorkId = ref(null);
const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentText = ref('');
const commentBusy = ref(false);
const commentStatus = ref('');
const ratingBusy = ref(false);
const ratingStatus = ref('');
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

const { isAuthenticated } = useSession();

const sectionOptions = [
  { value: '', label: 'Все разделы' },
  { value: 'poetry', label: 'Поэзия' },
  { value: 'prose', label: 'Проза' },
  { value: 'project', label: 'Творческие проекты' },
];

const projectFormats = [
  { value: '', label: 'Без уточнения' },
  { value: 'song', label: 'Песня' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'stage_production', label: 'Постановка' },
  { value: 'screenplay', label: 'Киносценарий' },
  { value: 'other', label: 'Другое' },
];

const queryVariables = computed(() => ({
  limit: 24,
  offset: 0,
  sectionCode: sectionFilter.value || null,
  search: search.value.trim() || null,
}));

const { result, loading, error, refetch } = useQuery(WORKS_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const works = computed(() => result.value?.works ?? []);
const selectedWork = computed(() => works.value.find((item) => String(item.id) === String(selectedWorkId.value)) ?? null);

watch(works, (items) => {
  if (!items.length) {
    selectedWorkId.value = null;
    comments.value = [];
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedWorkId.value));
  if (!stillExists) {
    selectedWorkId.value = items[0].id;
  }
}, { immediate: true });

watch(selectedWorkId, (workId) => {
  if (!workId) {
    comments.value = [];
    return;
  }
  loadComments(workId);
}, { immediate: true });

function normalizeOptional(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

async function loadComments(workId) {
  commentsLoading.value = true;
  commentsError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: WORK_COMMENTS_QUERY,
      variables: {
        workId,
        limit: 100,
        offset: 0,
      },
      fetchPolicy: 'network-only',
    });
    comments.value = data?.workComments ?? [];
  } catch (queryError) {
    comments.value = [];
    commentsError.value = queryError.message;
  } finally {
    commentsLoading.value = false;
  }
}

async function submitRating(rating) {
  if (!selectedWork.value) return;
  ratingBusy.value = true;
  ratingStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: RATE_WORK_MUTATION,
      variables: {
        workId: selectedWork.value.id,
        rating,
      },
    });
    ratingStatus.value = `Оценка ${rating}/5 сохранена.`;
    await refetch();
  } catch (mutationError) {
    ratingStatus.value = mutationError.message;
  } finally {
    ratingBusy.value = false;
  }
}

async function submitComment() {
  if (!selectedWork.value) return;
  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: selectedWork.value.id,
        body: commentText.value.trim(),
        parentCommentId: null,
      },
    });
    commentText.value = '';
    commentStatus.value = 'Комментарий опубликован.';
    await Promise.all([refetch(), loadComments(selectedWork.value.id)]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
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

    createForm.value = {
      sectionCode: 'poetry',
      title: '',
      summary: '',
      body: '',
      projectFormat: '',
    };
    createStatus.value = 'Произведение создано.';
    await refetch();
    selectedWorkId.value = data?.createWork?.id ?? selectedWorkId.value;
  } catch (mutationError) {
    createError.value = mutationError.message;
  } finally {
    createBusy.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <h1>Произведения</h1>
    <p class="muted">
      Эта страница полностью переведена на backend: список работ, выбор произведения, live-комментарии,
      оценки и форма публикации нового текста.
    </p>
  </section>

  <section class="panel stack">
    <div class="toolbar">
      <div class="field" style="min-width: 220px; flex: 1;">
        <span class="label">Раздел</span>
        <select v-model="sectionFilter" class="select">
          <option v-for="option in sectionOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div class="field" style="min-width: 260px; flex: 2;">
        <span class="label">Поиск</span>
        <input v-model="search" class="input" placeholder="Название, summary или текст" />
      </div>
    </div>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="layout-columns">
    <div class="stack">
      <div class="section-head">
        <h2>Каталог</h2>
        <span class="pill">{{ loading ? 'загрузка…' : `${works.length} записей` }}</span>
      </div>

      <div v-if="works.length" class="stack">
        <article
          v-for="work in works"
          :key="work.id"
          class="card clickable"
          :class="{ 'is-selected': String(work.id) === String(selectedWorkId) }"
          @click="selectedWorkId = work.id"
        >
          <div class="chips">
            <span class="pill">{{ formatWorkSection(work.sectionCode) }}</span>
            <span class="pill">{{ ratingLabel(work.averageRating, work.ratingsCount) }}</span>
            <span class="pill">комментариев: {{ work.commentsCount }}</span>
          </div>
          <h3>{{ work.title }}</h3>
          <div class="meta">{{ work.author?.displayName || work.author?.login }} · {{ formatDate(work.publishedAt || work.createdAt) }}</div>
          <div>{{ excerptText(work.summary || work.excerpt || work.body, 180) }}</div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">Список пока пуст. После авторизации можно создать первое произведение прямо с этой страницы.</div>
    </div>

    <div class="stack">
      <article v-if="selectedWork" class="panel stack">
        <div class="section-head">
          <h2>{{ selectedWork.title }}</h2>
          <span class="pill">{{ formatWorkSection(selectedWork.sectionCode) }}</span>
        </div>

        <div class="meta">
          {{ selectedWork.author?.displayName || selectedWork.author?.login }} · {{ formatDate(selectedWork.publishedAt || selectedWork.createdAt) }}
        </div>
        <div class="chips">
          <span class="pill">{{ ratingLabel(selectedWork.averageRating, selectedWork.ratingsCount) }}</span>
          <span class="pill">комментариев: {{ selectedWork.commentsCount }}</span>
          <span v-if="selectedWork.projectFormat" class="pill">{{ selectedWork.projectFormat }}</span>
        </div>

        <div class="prewrap">{{ selectedWork.body || selectedWork.summary || selectedWork.excerpt || 'Текст пока не добавлен.' }}</div>

        <div v-if="isAuthenticated" class="stack">
          <div class="field">
            <span class="label">Оценить произведение</span>
            <div class="rate-row">
              <button
                v-for="rating in [1, 2, 3, 4, 5]"
                :key="rating"
                class="btn btn-outline"
                type="button"
                :disabled="ratingBusy"
                @click="submitRating(rating)"
              >
                {{ rating }}★
              </button>
            </div>
            <div v-if="ratingStatus" class="message" :class="ratingStatus.includes('сохранена') ? 'success' : 'error'">{{ ratingStatus }}</div>
          </div>

          <form class="stack" @submit.prevent="submitComment">
            <div class="field">
              <label for="new-comment">Новый комментарий</label>
              <textarea id="new-comment" v-model="commentText" class="textarea" required placeholder="Напиши отзыв о тексте" />
            </div>
            <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать комментарий' }}</button>
            <div v-if="commentStatus" class="message" :class="commentStatus.includes('опубликован') ? 'success' : 'error'">{{ commentStatus }}</div>
          </form>
        </div>
        <div v-else class="message">Чтобы ставить оценки и оставлять комментарии, войди или зарегистрируйся в шапке.</div>

        <hr class="divider" />

        <div class="section-head">
          <h3>Комментарии</h3>
          <span class="pill">{{ commentsLoading ? 'обновляем…' : `${comments.length} записей` }}</span>
        </div>
        <div v-if="commentsError" class="message error">{{ commentsError }}</div>
        <div v-if="comments.length" class="stack">
          <article v-for="comment in comments" :key="comment.id" class="comment-item">
            <strong>{{ comment.author?.displayName || comment.author?.login || 'Пользователь' }}</strong>
            <div class="meta">{{ formatDate(comment.createdAt) }}</div>
            <div class="comment-body">{{ comment.body }}</div>
          </article>
        </div>
        <div v-else-if="!commentsLoading" class="empty-state">Пока без комментариев — можно начать обсуждение первым.</div>
      </article>

      <div v-else class="empty-state">Выбери произведение слева, чтобы увидеть полный текст, комментарии и действия.</div>

      <article v-if="isAuthenticated" class="panel stack">
        <div class="section-head">
          <h2>Новая публикация</h2>
          <span class="pill good">mutation createWork</span>
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

          <button class="btn btn-primary" type="submit" :disabled="createBusy">{{ createBusy ? 'Публикуем…' : 'Опубликовать' }}</button>
          <div v-if="createStatus" class="message success">{{ createStatus }}</div>
          <div v-if="createError" class="message error">{{ createError }}</div>
        </form>
      </article>
    </div>
  </section>
</template>
