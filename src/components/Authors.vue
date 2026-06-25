<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';

import { AUTHORS_QUERY } from '../lib/graphql.js';
import { excerptText } from '../lib/format.js';
import { buildAuthorPageLocation } from '../lib/routes.js';

const search = ref('');
const onlyClassics = ref(false);
const onlyFeatured = ref(false);
const selectedLetter = ref('');
const currentPage = ref(1);
const pageSize = 40;
const sortBy = ref('rating');

const cyrillicLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Э', 'Ю', 'Я'];
const latinLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const queryVariables = computed(() => ({
  limit: 1000,
  offset: 0,
  search: search.value.trim() || null,
  classicsOnly: onlyClassics.value,
  featuredOnly: onlyFeatured.value,
}));

const { result, loading, error } = useQuery(AUTHORS_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const authors = computed(() => result.value?.authors ?? []);

function authorName(author) {
  return author?.displayName || author?.login || 'Автор';
}

function authorLogin(author) {
  return String(author?.login || '').trim();
}

function authorInitial(author) {
  const source = authorName(author).trim();
  return source ? source[0].toUpperCase() : 'А';
}

function authorLetter(author) {
  const source = authorName(author).trim().toUpperCase();
  return source ? source[0] : '';
}

const filteredAuthors = computed(() => {
  const targetLetter = selectedLetter.value;
  const base = targetLetter
    ? authors.value.filter((author) => authorLetter(author) === targetLetter)
    : authors.value;

  return [...base].sort((left, right) => {
    if (sortBy.value === 'newest') {
      const rightTime = Date.parse(right?.registeredAt || '') || 0;
      const leftTime = Date.parse(left?.registeredAt || '') || 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
    }

    if (sortBy.value === 'name') {
      return String(left?.displayName || left?.login || '').localeCompare(String(right?.displayName || right?.login || ''), 'ru');
    }

    const ratingDiff = Number(right?.ratingTotal || 0) - Number(left?.ratingTotal || 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    const worksDiff = Number(right?.worksCountCached || 0) - Number(left?.worksCountCached || 0);
    if (worksDiff !== 0) {
      return worksDiff;
    }

    const rightTime = Date.parse(right?.registeredAt || '') || 0;
    const leftTime = Date.parse(left?.registeredAt || '') || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return String(left?.displayName || left?.login || '').localeCompare(String(right?.displayName || right?.login || ''), 'ru');
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAuthors.value.length / pageSize)));
const pagedAuthors = computed(() => {
  const safePage = Math.min(Math.max(currentPage.value, 1), totalPages.value);
  const start = (safePage - 1) * pageSize;
  return filteredAuthors.value.slice(start, start + pageSize);
});
const hasPrevPage = computed(() => currentPage.value > 1);
const hasNextPage = computed(() => currentPage.value < totalPages.value);

watch([search, onlyClassics, onlyFeatured, selectedLetter, sortBy], () => {
  currentPage.value = 1;
});

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value;
  }
});

const availableLetters = computed(() => new Set(authors.value.map(authorLetter).filter(Boolean)));
const authorsCountText = computed(() => loading.value ? 'загрузка…' : `${filteredAuthors.value.length} авторов`);
const pageLabel = computed(() => `страница ${currentPage.value} из ${totalPages.value}`);
</script>

<template>
  <section class="page-head authors-directory-head">
    <h1>Авторы</h1>
    <p class="muted">
      Каталог авторов в плотной витринной подаче: алфавитный фильтр, аватарки, логины, рейтинг и быстрый переход на персональную страницу по имени автора.
    </p>
  </section>

  <section class="panel stack authors-directory-panel">
    <div class="section-head">
      <div>
        <h2>Каталог авторов</h2>
        <div class="meta">{{ authorsCountText }}</div>
      </div>
      <RouterLink class="btn btn-outline" to="/">На главную</RouterLink>
    </div>

    <div class="toolbar">
      <div class="field" style="min-width: 260px; flex: 2;">
        <span class="label">Поиск</span>
        <input v-model="search" class="input" placeholder="Имя, логин или email" />
      </div>

      <label class="chip">
        <input v-model="onlyFeatured" type="checkbox" />
        <span>Только витрина</span>
      </label>

      <label class="chip">
        <input v-model="onlyClassics" type="checkbox" />
        <span>Только классики</span>
      </label>

      <label class="chip">
        <span>Сортировка</span>
        <select v-model="sortBy" class="select authors-sort-select">
          <option value="rating">По рейтингу</option>
          <option value="newest">Сначала новые</option>
          <option value="name">По имени</option>
        </select>
      </label>

      <button class="btn btn-outline" type="button" @click="selectedLetter = ''">Все буквы</button>
    </div>

    <div class="authors-letter-block stack">
      <div class="meta">Выбрать авторов по:</div>
      <div class="authors-letter-row">
        <button
          v-for="letter in cyrillicLetters"
          :key="`ru-${letter}`"
          class="authors-letter-btn"
          :class="{ 'is-selected': selectedLetter === letter, 'is-disabled': !availableLetters.has(letter) }"
          type="button"
          :disabled="!availableLetters.has(letter)"
          @click="selectedLetter = letter"
        >
          {{ letter }}
        </button>
      </div>
      <div class="authors-letter-row">
        <button
          v-for="letter in latinLetters"
          :key="`en-${letter}`"
          class="authors-letter-btn"
          :class="{ 'is-selected': selectedLetter === letter, 'is-disabled': !availableLetters.has(letter) }"
          type="button"
          :disabled="!availableLetters.has(letter)"
          @click="selectedLetter = letter"
        >
          {{ letter }}
        </button>
      </div>
    </div>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section v-if="pagedAuthors.length" class="stack">
    <div class="authors-pagination-bar">
      <div class="meta">{{ pageLabel }} · по {{ pageSize }} авторов на страницу</div>
      <div class="inline-actions">
        <button class="btn btn-outline" type="button" :disabled="!hasPrevPage" @click="currentPage -= 1">← Назад</button>
        <button class="btn btn-outline" type="button" :disabled="!hasNextPage" @click="currentPage += 1">Вперёд →</button>
      </div>
    </div>

    <div class="authors-directory-grid authors-directory-grid-paged">
      <article v-for="author in pagedAuthors" :key="author.id" class="authors-directory-card">
      <RouterLink class="authors-directory-portrait" :to="buildAuthorPageLocation(author)">
        <img v-if="author.avatarUrl" :src="author.avatarUrl" class="authors-directory-portrait-img" alt="Аватар автора" />
        <div v-else class="authors-directory-portrait-fallback">{{ authorInitial(author) }}</div>
      </RouterLink>

      <div class="authors-directory-body">
        <h3 class="authors-directory-title">
          <RouterLink :to="buildAuthorPageLocation(author)">{{ authorName(author) }}</RouterLink>
        </h3>
        <div class="authors-directory-login">
          [<RouterLink :to="buildAuthorPageLocation(author)">{{ authorLogin(author) }}</RouterLink>]
        </div>
        <div class="authors-directory-meta">
          <span>Рейтинг: {{ author.ratingTotal }}</span>
          <span>Произведений: {{ author.worksCountCached }}</span>
        </div>
        <div v-if="author.city" class="meta">{{ author.city }}</div>
        <div v-if="author.bio" class="authors-directory-bio">{{ excerptText(author.bio, 180) }}</div>
        <div class="chips">
          <span v-if="author.isOnline" class="pill good">в сети</span>
          <span v-if="author.isFeatured" class="pill good">витрина</span>
          <span v-if="author.isClassic" class="pill warn">классик</span>
        </div>
      </div>
    </article>
    </div>

    <div class="authors-pagination-bar authors-pagination-bar-bottom">
      <div class="meta">{{ pageLabel }}</div>
      <div class="inline-actions">
        <button class="btn btn-outline" type="button" :disabled="!hasPrevPage" @click="currentPage -= 1">← Назад</button>
        <button class="btn btn-outline" type="button" :disabled="!hasNextPage" @click="currentPage += 1">Вперёд →</button>
      </div>
    </div>
  </section>

  <section v-else-if="!loading" class="panel stack">
    <div class="empty-state">По текущему фильтру авторы не найдены.</div>
  </section>
</template>
