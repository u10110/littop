<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';

import WorkDiscussionPanel from './WorkDiscussionPanel.vue';
import {
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
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedWorkId.value));
  if (!stillExists) {
    selectedWorkId.value = items[0].id;
  }
}, { immediate: true });

async function refreshSelectedWork() {
  await refetch();
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
            <span class="pill">отзывов: {{ work.commentsCount }}</span>
            <span class="pill">лайков: {{ work.likesCount }}</span>
            <span class="pill">дизлайков: {{ work.dislikesCount }}</span>
          </div>
          <h3>{{ work.title }}</h3>
          <div class="meta">
            <RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)" @click.stop>{{ work.author?.displayName || work.author?.login }}</RouterLink>
            <template v-else>{{ work.author?.displayName || work.author?.login }}</template>
            · {{ formatDate(work.publishedAt || work.createdAt) }}
          </div>
          <div>{{ excerptText(work.summary || work.excerpt || work.body, 180) }}</div>
          <div class="inline-actions">
            <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(work)" @click.stop>Страница произведения</RouterLink>
            <RouterLink v-if="work.author?.login" class="btn btn-outline" :to="buildAuthorPageLocation(work.author)" @click.stop>Автор</RouterLink>
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
          <RouterLink v-if="selectedWork.author?.login" :to="buildAuthorPageLocation(selectedWork.author)">{{ selectedWork.author?.displayName || selectedWork.author?.login }}</RouterLink>
          <template v-else>{{ selectedWork.author?.displayName || selectedWork.author?.login }}</template>
          · {{ formatDate(selectedWork.publishedAt || selectedWork.createdAt) }}
        </div>
        <div class="chips">
          <span class="pill">{{ ratingLabel(selectedWork.averageRating, selectedWork.ratingsCount) }}</span>
          <span class="pill">отзывов: {{ selectedWork.commentsCount }}</span>
          <span class="pill">лайков: {{ selectedWork.likesCount }}</span>
          <span class="pill">дизлайков: {{ selectedWork.dislikesCount }}</span>
          <span v-if="selectedWork.projectFormat" class="pill">{{ selectedWork.projectFormat }}</span>
        </div>
        <div class="inline-actions">
          <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(selectedWork)">Публичная страница произведения</RouterLink>
          <RouterLink v-if="selectedWork.author?.login" class="btn btn-outline" :to="buildAuthorPageLocation(selectedWork.author)">Страница автора</RouterLink>
        </div>

        <div class="prewrap">{{ selectedWork.body || selectedWork.summary || selectedWork.excerpt || 'Текст пока не добавлен.' }}</div>
      </article>

      <WorkDiscussionPanel v-if="selectedWork" :work="selectedWork" @refresh="refreshSelectedWork" />
      <div v-else class="empty-state">Выбери произведение слева, чтобы увидеть полный текст, отзывы и действия.</div>
    </div>
  </section>
</template>
