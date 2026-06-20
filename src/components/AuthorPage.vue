<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_QUERY, WORKS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatDateTime, formatWorkSection } from '../lib/format.js';
import { buildWorkPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { setDocumentTitle } from '../lib/pageTitle.js';

const route = useRoute();

const author = ref(null);
const authorWorks = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');

const authorLogin = computed(() => normalizeRouteParam(route.params.login));
const hasAuthor = computed(() => Boolean(author.value));
const notFound = computed(() => !pageLoading.value && !pageError.value && Boolean(authorLogin.value) && !author.value);

const authorInitial = computed(() => {
  const source = String(author.value?.displayName || author.value?.login || '').trim();
  return source ? source[0].toUpperCase() : 'А';
});

const profileLinkLabel = computed(() => {
  const url = String(author.value?.websiteUrl || '').toLowerCase();
  if (!url) return '';
  if (url.includes('telegram') || url.includes('t.me')) return 'Я в Telegram';
  return 'Сайт автора';
});

const authorFacts = computed(() => {
  if (!author.value) return [];

  const facts = [
    { label: 'Логин', value: `@${author.value.login}` },
    { label: 'С нами с', value: formatDate(author.value.registeredAt) },
    { label: 'Рейтинг автора', value: String(author.value.ratingTotal ?? 0) },
    { label: 'Произведений', value: String(authorWorks.value.length || author.value.worksCountCached || 0) },
  ];

  if (author.value.city) {
    facts.push({ label: 'Город', value: author.value.city });
  }

  if (author.value.isFeatured) {
    facts.push({ label: 'Статус', value: 'Автор витрины' });
  } else if (author.value.isClassic) {
    facts.push({ label: 'Статус', value: 'Классик' });
  }

  return facts;
});

const workRows = computed(() => authorWorks.value.map((work, index) => {
  const parts = [formatWorkSection(work.sectionCode)];

  if (Number(work.averageRating) > 0 || Number(work.ratingsCount) > 0) {
    parts.push(`рейтинг ${Number(work.averageRating || 0).toFixed(1)}`);
  }

  if (Number(work.commentsCount) > 0) {
    parts.push(`отзывов ${work.commentsCount}`);
  }

  parts.push(`опубл. ${formatDateTime(work.publishedAt || work.createdAt)}`);

  return {
    ...work,
    order: index + 1,
    metaLine: parts.join(' / '),
  };
}));

watch(authorLogin, (login) => {
  loadAuthorPage(login);
}, { immediate: true });

watch([author, authorLogin, pageLoading, pageError], () => {
  if (author.value?.displayName) {
    setDocumentTitle(author.value.displayName);
    return;
  }
  if (pageError.value) {
    setDocumentTitle('Ошибка автора');
    return;
  }
  if (!pageLoading.value && authorLogin.value) {
    setDocumentTitle('Автор не найден');
    return;
  }
  setDocumentTitle('Страница автора');
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
  <section class="page-head author-showcase-head">
    <div class="section-head">
      <div>
        <h1>Страница автора</h1>
        <p class="muted">Публичная авторская страница в литературной подаче, с большим фото и отдельной аватаркой автора.</p>
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

  <section v-else-if="hasAuthor" class="author-showcase-page">
    <div class="author-cover-card" :class="{ 'author-cover-card-empty': !author.coverImageUrl }">
      <img v-if="author.coverImageUrl" :src="author.coverImageUrl" class="author-cover-image" alt="Большое фото автора" />
      <div v-else class="author-cover-placeholder">
        <div class="author-paper-eyebrow">Большое фото автора</div>
        <strong>Здесь может быть крупный снимок, загруженный из кабинета.</strong>
      </div>
    </div>

    <div class="author-showcase-shell">
      <aside class="author-showcase-sidebar">
        <article class="author-profile-rail">
          <div class="author-portrait author-portrait-photo">
            <img v-if="author.avatarUrl" :src="author.avatarUrl" class="author-portrait-image" alt="Аватар автора" />
            <template v-else>{{ authorInitial }}</template>
          </div>
          <div class="author-name-block">
            <h2>{{ author.displayName }}</h2>
            <div class="author-login-link">[{{ author.login }}]</div>
          </div>

          <div class="author-status-strip">
            <span v-if="author.isFeatured" class="author-status-pill">Автор витрины</span>
            <span v-else-if="author.isClassic" class="author-status-pill">Классик</span>
            <span v-else class="author-status-pill">Публичная страница</span>
          </div>

          <div class="author-facts-list">
            <div v-for="fact in authorFacts" :key="fact.label" class="author-fact-row">
              <span>{{ fact.label }}</span>
              <strong>{{ fact.value }}</strong>
            </div>
          </div>

          <a
            v-if="author.websiteUrl"
            class="author-portal-link"
            :href="author.websiteUrl"
            target="_blank"
            rel="noreferrer"
          >
            {{ profileLinkLabel }}
          </a>
        </article>
      </aside>

      <div class="author-showcase-main">
        <article class="author-paper-card">
          <div class="author-paper-eyebrow">Информация об авторе</div>
          <h2 class="author-paper-title">{{ author.displayName }}</h2>
          <div class="author-paper-meta">@{{ author.login }} · на сайте с {{ formatDate(author.registeredAt) }}</div>
          <div class="author-paper-text">
            {{ author.bio || 'Автор пока не добавил подробную биографию. Здесь будет литературная визитка, заметки о себе и авторские ссылки.' }}
          </div>
        </article>

        <section class="author-paper-card">
          <div class="section-head">
            <div>
              <div class="author-paper-eyebrow">Авторская лента</div>
              <h3 class="author-paper-title author-paper-title-sm">Произведения</h3>
            </div>
            <span class="author-counter">{{ worksLoading ? 'обновляем…' : `${workRows.length} записей` }}</span>
          </div>

          <ol v-if="workRows.length" class="author-works-ledger">
            <li v-for="work in workRows" :key="work.id" class="author-works-ledger-item">
              <div class="author-work-order">{{ work.order }}.</div>
              <div class="author-work-body">
                <RouterLink class="author-work-title" :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink>
                <div class="author-work-meta">{{ work.metaLine }}</div>
                <div class="author-work-excerpt">{{ excerptText(work.summary || work.excerpt || work.body, 260) }}</div>
              </div>
            </li>
          </ol>
          <div v-else-if="!worksLoading" class="empty-state author-empty-ledger">У этого автора пока нет опубликованных произведений.</div>
        </section>
      </div>
    </div>
  </section>
</template>
