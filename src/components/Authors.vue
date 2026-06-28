<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';

import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_DETAILS_QUERY, AUTHORS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';

const search = ref('');
const onlyClassics = ref(false);
const onlyFeatured = ref(false);
const selectedAuthorLogin = ref('');
const selectedAuthor = ref(null);
const authorWorks = ref([]);
const detailLoading = ref(false);
const detailError = ref('');

const queryVariables = computed(() => ({
  limit: 30,
  offset: 0,
  search: search.value.trim() || null,
  classicsOnly: onlyClassics.value,
  featuredOnly: onlyFeatured.value,
}));

const { result, loading, error } = useQuery(AUTHORS_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const authors = computed(() => result.value?.authors ?? []);

watch(authors, (items) => {
  if (!items.length) {
    selectedAuthorLogin.value = '';
    selectedAuthor.value = null;
    authorWorks.value = [];
    return;
  }

  const stillExists = items.some((item) => item.login === selectedAuthorLogin.value);
  if (!stillExists) {
    selectedAuthorLogin.value = items[0].login;
  }
}, { immediate: true });

watch(selectedAuthorLogin, (login) => {
  if (!login) return;
  loadAuthorDetails(login);
}, { immediate: true });

async function loadAuthorDetails(login) {
  const baseAuthor = authors.value.find((item) => item.login === login);
  if (!baseAuthor) return;

  detailLoading.value = true;
  detailError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: AUTHOR_DETAILS_QUERY,
      variables: {
        login,
        authorId: baseAuthor.id,
      },
      fetchPolicy: 'network-only',
    });
    selectedAuthor.value = data?.author ?? baseAuthor;
    authorWorks.value = data?.works ?? [];
  } catch (queryError) {
    selectedAuthor.value = baseAuthor;
    authorWorks.value = [];
    detailError.value = queryError.message;
  } finally {
    detailLoading.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <h1>Авторы</h1>
    <p class="muted">
      Страница больше не держит руками забитую витрину: список, поиск, фильтры и карточка автора подтягиваются
      из queries <code>authors</code> и <code>works(authorId: ...)</code>.
    </p>
  </section>

  <section class="panel stack">
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
    </div>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="layout-columns">
    <div class="stack">
      <div class="section-head">
        <h2>Список авторов</h2>
        <span class="pill">{{ loading ? 'загрузка…' : `${authors.length} найдено` }}</span>
      </div>

      <div v-if="authors.length" class="stack">
        <article
          v-for="author in authors"
          :key="author.id"
          class="card clickable"
          :class="{ 'is-selected': author.login === selectedAuthorLogin }"
          @click="selectedAuthorLogin = author.login"
        >
          <div class="section-head">
            <h3>
              <RouterLink :to="buildAuthorPageLocation(author)" @click.stop>{{ author.displayName }}</RouterLink>
            </h3>
            <div class="chips">
              <span v-if="author.isFeatured" class="pill good">витрина</span>
              <span v-if="author.isClassic" class="pill warn">классик</span>
            </div>
          </div>
          <div class="meta">@{{ author.login }} · {{ author.email }}</div>
          <div>{{ excerptText(author.bio, 120) }}</div>
          <div class="inline-actions">
            <RouterLink class="btn btn-outline" :to="buildAuthorPageLocation(author)" @click.stop>Страница автора</RouterLink>
          </div>
          <div class="chips">
            <span class="pill">рейтинг {{ author.ratingTotal }}</span>
            <span class="pill">{{ author.worksCountCached }} произведений</span>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">Авторов пока нет. После регистраций они будут появляться здесь автоматически.</div>
    </div>

    <div class="stack">
      <article v-if="selectedAuthor" class="panel stack">
        <div class="section-head">
          <h2>
            <RouterLink :to="buildAuthorPageLocation(selectedAuthor)">{{ selectedAuthor.displayName }}</RouterLink>
          </h2>
          <span class="pill">@{{ selectedAuthor.login }}</span>
        </div>

        <div class="meta">
          {{ selectedAuthor.email }} · с нами с {{ formatDate(selectedAuthor.registeredAt) }}
        </div>
        <div class="chips">
          <span class="pill">рейтинг {{ selectedAuthor.ratingTotal }}</span>
          <span class="pill">{{ selectedAuthor.worksCountCached }} произведений</span>
          <span v-if="selectedAuthor.city" class="pill">{{ selectedAuthor.city }}</span>
        </div>
        <div>{{ excerptText(selectedAuthor.bio, 220) }}</div>
        <div class="inline-actions">
          <a v-if="selectedAuthor.websiteUrl" class="btn btn-outline" :href="selectedAuthor.websiteUrl" target="_blank" rel="noreferrer">Сайт автора</a>
          <RouterLink class="btn btn-outline" :to="buildAuthorPageLocation(selectedAuthor)">Публичная страница автора</RouterLink>
        </div>

        <hr class="divider" />

        <div class="section-head">
          <h3>Последние публикации</h3>
          <span class="pill">{{ detailLoading ? 'обновляем…' : `${authorWorks.length} записей` }}</span>
        </div>
        <div v-if="detailError" class="message error">{{ detailError }}</div>
        <div v-if="authorWorks.length" class="stack">
          <article v-for="work in authorWorks" :key="work.id" class="work-card">
            <div class="section-head">
              <strong>{{ work.title }}</strong>
              <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(work)">Открыть</RouterLink>
            </div>
            <div class="meta">{{ formatWorkSection(work.sectionCode) }} · {{ formatDate(work.publishedAt || work.createdAt) }}</div>
            <div>{{ excerptText(work.summary || work.excerpt || work.body, 150) }}</div>
            <div class="meta">{{ ratingLabel(work.averageRating, work.ratingsCount) }}</div>
          </article>
        </div>
        <div v-else-if="!detailLoading" class="empty-state">У этого автора пока нет опубликованных произведений.</div>
      </article>

      <div v-else class="empty-state">Выбери автора слева, чтобы увидеть его карточку и последние публикации.</div>
    </div>
  </section>
</template>
