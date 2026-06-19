<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_QUERY, WORKS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildWorkPageLocation, normalizeRouteParam } from '../lib/routes.js';

const route = useRoute();

const author = ref(null);
const authorWorks = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');

const authorLogin = computed(() => normalizeRouteParam(route.params.login));
const hasAuthor = computed(() => Boolean(author.value));
const notFound = computed(() => !pageLoading.value && !pageError.value && Boolean(authorLogin.value) && !author.value);

watch(authorLogin, (login) => {
  loadAuthorPage(login);
}, { immediate: true });

async function loadAuthorPage(login) {
  author.value = null;
  authorWorks.value = [];
  pageError.value = '';

  if (!login) {
    return;
  }

  pageLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: AUTHOR_QUERY,
      variables: { login },
      fetchPolicy: 'network-only',
    });

    author.value = data?.author ?? null;

    if (author.value?.id) {
      await loadAuthorWorks(author.value.id);
    }
  } catch (queryError) {
    pageError.value = queryError.message;
  } finally {
    pageLoading.value = false;
  }
}

async function loadAuthorWorks(authorId) {
  worksLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: WORKS_QUERY,
      variables: {
        limit: 50,
        offset: 0,
        sectionCode: null,
        search: null,
        authorId,
      },
      fetchPolicy: 'network-only',
    });
    authorWorks.value = data?.works ?? [];
  } catch (queryError) {
    pageError.value = queryError.message;
    authorWorks.value = [];
  } finally {
    worksLoading.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <div class="section-head">
      <div>
        <h1>Страница автора</h1>
        <p class="muted">Публичный профиль автора доступен всем посетителям сайта.</p>
      </div>
      <RouterLink class="btn btn-outline" to="/authors">← К списку авторов</RouterLink>
    </div>
  </section>

  <div v-if="pageError" class="message error">{{ pageError }}</div>

  <section v-if="pageLoading" class="panel stack">
    <div class="empty-state">Загружаем страницу автора…</div>
  </section>

  <section v-else-if="notFound" class="panel stack">
    <div class="empty-state">Автор с таким логином не найден.</div>
  </section>

  <section v-else-if="hasAuthor" class="stack">
    <article class="panel stack">
      <div class="section-head">
        <div>
          <h2>{{ author.displayName }}</h2>
          <div class="meta">@{{ author.login }} · с нами с {{ formatDate(author.registeredAt) }}</div>
        </div>
        <div class="chips">
          <span v-if="author.isFeatured" class="pill good">витрина</span>
          <span v-if="author.isClassic" class="pill warn">классик</span>
        </div>
      </div>

      <div class="chips">
        <span class="pill">рейтинг {{ author.ratingTotal }}</span>
        <span class="pill">{{ author.worksCountCached }} произведений</span>
        <span v-if="author.city" class="pill">{{ author.city }}</span>
      </div>

      <div>{{ author.bio || 'Автор пока не заполнил биографию.' }}</div>

      <div class="inline-actions">
        <a
          v-if="author.websiteUrl"
          class="btn btn-outline"
          :href="author.websiteUrl"
          target="_blank"
          rel="noreferrer"
        >
          Сайт автора
        </a>
      </div>
    </article>

    <section class="panel stack">
      <div class="section-head">
        <h2>Произведения автора</h2>
        <span class="pill">{{ worksLoading ? 'обновляем…' : `${authorWorks.length} записей` }}</span>
      </div>

      <div v-if="authorWorks.length" class="stack">
        <article v-for="work in authorWorks" :key="work.id" class="work-card stack">
          <div class="chips">
            <span class="pill">{{ formatWorkSection(work.sectionCode) }}</span>
            <span class="pill">{{ ratingLabel(work.averageRating, work.ratingsCount) }}</span>
            <span class="pill">комментариев: {{ work.commentsCount }}</span>
          </div>
          <div class="section-head">
            <h3>{{ work.title }}</h3>
            <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(work)">Открыть произведение</RouterLink>
          </div>
          <div class="meta">{{ formatDate(work.publishedAt || work.createdAt) }}</div>
          <div>{{ excerptText(work.summary || work.excerpt || work.body, 220) }}</div>
        </article>
      </div>
      <div v-else-if="!worksLoading" class="empty-state">У этого автора пока нет опубликованных произведений.</div>
    </section>
  </section>
</template>
