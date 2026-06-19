<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';

import { apolloClient } from '../lib/apollo.js';
import {
  ADD_WORK_COMMENT_MUTATION,
  RATE_WORK_MUTATION,
  WORK_COMMENTS_QUERY,
  WORKS_QUERY,
} from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();

const sectionFilter = ref('');
const search = ref('');
const mineOnly = ref(false);
const selectedWorkId = ref(null);
const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentText = ref('');
const commentBusy = ref(false);
const commentStatus = ref('');
const ratingBusy = ref(false);
const ratingStatus = ref('');

const { currentUser, isAuthenticated } = useSession();

const allowedSectionCodes = new Set(['poetry', 'prose', 'project']);

const sectionOptions = [
  { value: '', label: 'Все разделы' },
  { value: 'poetry', label: 'Поэзия' },
  { value: 'prose', label: 'Проза' },
  { value: 'project', label: 'Творческие проекты' },
];

function takeQueryValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
}

function normalizeSectionQuery(value) {
  const normalized = takeQueryValue(value).trim();
  return allowedSectionCodes.has(normalized) ? normalized : '';
}

function normalizeSearchQuery(value) {
  return takeQueryValue(value).trim();
}

function normalizeMineQuery(value) {
  const normalized = takeQueryValue(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'mine', 'my'].includes(normalized);
}

function applyFiltersFromQuery(query) {
  sectionFilter.value = normalizeSectionQuery(query.section);
  search.value = normalizeSearchQuery(query.search);
  mineOnly.value = normalizeMineQuery(query.mine);
}

function buildNextQuery(baseQuery) {
  const nextQuery = { ...baseQuery };
  const normalizedSearch = search.value.trim();

  if (sectionFilter.value) {
    nextQuery.section = sectionFilter.value;
  } else {
    delete nextQuery.section;
  }

  if (normalizedSearch) {
    nextQuery.search = normalizedSearch;
  } else {
    delete nextQuery.search;
  }

  if (mineOnly.value) {
    nextQuery.mine = '1';
  } else {
    delete nextQuery.mine;
  }

  return nextQuery;
}

function managedQuerySnapshot(query) {
  return JSON.stringify({
    section: normalizeSectionQuery(query.section),
    search: normalizeSearchQuery(query.search),
    mine: normalizeMineQuery(query.mine),
  });
}

watch(
  () => route.query,
  (query) => {
    const querySnapshot = managedQuerySnapshot(query);
    const stateSnapshot = JSON.stringify({
      section: sectionFilter.value,
      search: search.value.trim(),
      mine: mineOnly.value,
    });

    if (querySnapshot !== stateSnapshot) {
      applyFiltersFromQuery(query);
    }
  },
  { immediate: true },
);

watch([sectionFilter, search, mineOnly], () => {
  const stateSnapshot = JSON.stringify({
    section: sectionFilter.value,
    search: search.value.trim(),
    mine: mineOnly.value,
  });
  const querySnapshot = managedQuerySnapshot(route.query);

  if (stateSnapshot === querySnapshot) {
    return;
  }

  router.replace({ query: buildNextQuery(route.query) });
});

const authorFilterActive = computed(() => mineOnly.value && Boolean(currentUser.value?.id));
const mineFilterNeedsAuth = computed(() => mineOnly.value && !authorFilterActive.value);

const queryVariables = computed(() => ({
  limit: 24,
  offset: 0,
  sectionCode: sectionFilter.value || null,
  search: search.value.trim() || null,
  authorId: authorFilterActive.value ? currentUser.value.id : null,
}));

const { result, loading, error, refetch } = useQuery(WORKS_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const works = computed(() => result.value?.works ?? []);
const selectedWork = computed(() => works.value.find((item) => String(item.id) === String(selectedWorkId.value)) ?? null);
const activeFilterPills = computed(() => {
  const pills = [];

  if (sectionFilter.value) {
    const match = sectionOptions.find((option) => option.value === sectionFilter.value);
    pills.push(`раздел: ${match?.label || sectionFilter.value}`);
  }

  if (search.value.trim()) {
    pills.push(`поиск: ${search.value.trim()}`);
  }

  if (mineOnly.value) {
    pills.push('только мои произведения');
  }

  return pills;
});
const emptyStateText = computed(() => {
  if (mineOnly.value && isAuthenticated.value) {
    return 'По текущему фильтру твои произведения пока не найдены.';
  }

  return 'Список пока пуст.';
});

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

function clearFilters() {
  sectionFilter.value = '';
  search.value = '';
  mineOnly.value = false;
}
</script>

<template>
  <section class="page-head">
    <h1>Произведения</h1>
    <p class="muted">
      Фильтры этой страницы читаются из адресной строки и синхронизируются обратно в URL. Можно открывать готовые ссылки
      вида <code>/works?mine=1</code> или <code>/works?section=poetry</code>.
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

      <div class="field" style="min-width: 240px; flex: 1; align-self: end;">
        <span class="label">Быстрый фильтр</span>
        <div class="inline-actions">
          <button class="btn" :class="mineOnly ? 'btn-primary' : 'btn-outline'" type="button" @click="mineOnly = !mineOnly">
            {{ mineOnly ? 'Показываются мои' : 'Только мои произведения' }}
          </button>
          <button class="btn btn-outline" type="button" @click="clearFilters">Сбросить</button>
        </div>
      </div>
    </div>

    <div v-if="activeFilterPills.length" class="chips">
      <span v-for="pill in activeFilterPills" :key="pill" class="pill">{{ pill }}</span>
    </div>

    <div v-if="mineFilterNeedsAuth" class="message">
      Фильтр <strong>«только мои произведения»</strong> пришёл из адресной строки, но для точной выборки нужен вход в аккаунт.
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
          <div class="meta">
            <RouterLink v-if="work.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(work.author)" @click.stop>{{ work.author?.displayName || work.author?.login }}</RouterLink>
            <template v-else>{{ work.author?.displayName || work.author?.login }}</template>
            · {{ formatDate(work.publishedAt || work.createdAt) }}
          </div>
          <div>{{ excerptText(work.summary || work.excerpt || work.body, 180) }}</div>
          <div class="inline-actions">
            <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(work)" @click.stop>Страница произведения</RouterLink>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">{{ emptyStateText }}</div>
    </div>

    <div class="stack">
      <article v-if="selectedWork" class="panel stack">
        <div class="section-head">
          <h2>{{ selectedWork.title }}</h2>
          <span class="pill">{{ formatWorkSection(selectedWork.sectionCode) }}</span>
        </div>

        <div class="meta">
          <RouterLink v-if="selectedWork.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(selectedWork.author)">{{ selectedWork.author?.displayName || selectedWork.author?.login }}</RouterLink>
          <template v-else>{{ selectedWork.author?.displayName || selectedWork.author?.login }}</template>
          · {{ formatDate(selectedWork.publishedAt || selectedWork.createdAt) }}
        </div>
        <div class="chips">
          <span class="pill">{{ ratingLabel(selectedWork.averageRating, selectedWork.ratingsCount) }}</span>
          <span class="pill">комментариев: {{ selectedWork.commentsCount }}</span>
          <span v-if="selectedWork.projectFormat" class="pill">{{ selectedWork.projectFormat }}</span>
        </div>
        <div class="inline-actions">
          <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(selectedWork)">Публичная страница произведения</RouterLink>
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
            <strong>
              <RouterLink v-if="comment.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(comment.author)">{{ comment.author?.displayName || comment.author?.login || 'Пользователь' }}</RouterLink>
              <template v-else>{{ comment.author?.displayName || comment.author?.login || 'Пользователь' }}</template>
            </strong>
            <div class="meta">{{ formatDate(comment.createdAt) }}</div>
            <div class="comment-body">{{ comment.body }}</div>
          </article>
        </div>
        <div v-else-if="!commentsLoading" class="empty-state">Пока без комментариев — можно начать обсуждение первым.</div>
      </article>

      <div v-else class="empty-state">Выбери произведение слева, чтобы увидеть полный текст, комментарии и действия.</div>
    </div>
  </section>
</template>
