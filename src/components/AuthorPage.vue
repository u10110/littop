<script setup>
import {computed, ref, watch} from 'vue';
import {RouterLink, useRoute} from 'vue-router';

import {apolloClient} from '../lib/apollo.js';
import {useSession} from '../lib/session.js';
import {AUTHOR_QUERY, WORKS_QUERY} from '../lib/graphql.js';
import {excerptText, formatDate, formatDateTime, formatWorkSection} from '../lib/format.js';
import {buildWorkPageLocation, normalizeRouteParam} from '../lib/routes.js';

const route = useRoute();
const {isAuthenticated, currentUser} = useSession();

const author = ref(null);
const authorWorks = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');

const authorLogin = computed(() => normalizeRouteParam(route.params.login));
const hasAuthor = computed(() => Boolean(author.value));
const canMessageAuthor = computed(() => isAuthenticated.value && Boolean(author.value?.id) && String(author.value.id) !== String(currentUser.value?.id));
const messageAuthorLocation = computed(() => ({ path: '/messages', query: { to: author.value?.login } }));
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
    {label: 'Логин', value: `@${author.value.login}`},
    {label: 'С нами с', value: formatDate(author.value.registeredAt)},
    {label: 'Рейтинг автора', value: String(author.value.ratingTotal ?? 0)},
    {label: 'Произведений', value: String(authorWorks.value.length || author.value.worksCountCached || 0)},
  ];

  if (author.value.city) {
    facts.push({label: 'Город', value: author.value.city});
  }

  if (author.value.isFeatured) {
    facts.push({label: 'Статус', value: 'Автор витрины'});
  } else if (author.value.isClassic) {
    facts.push({label: 'Статус', value: 'Классик'});
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
}, {immediate: true});

async function loadAuthorPage(login) {
  author.value = null;
  authorWorks.value = [];
  pageError.value = '';

  if (!login) {
    return;
  }

  pageLoading.value = true;

  try {
    const {data} = await apolloClient.query({
      query: AUTHOR_QUERY,
      variables: {login},
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
    const {data} = await apolloClient.query({
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
  <main class="container authors-page">
    <RouterLink class="back" to="/authors">← Все авторы</RouterLink>
    <p v-if="pageError" class="ref-error">{{ pageError }}</p>
    <section v-else-if="pageLoading" class="detail-loading">Загружаем страницу автора…</section>
    <section v-else-if="notFound" class="detail-loading">Автор с таким логином не найден.</section>
    <section v-else-if="hasAuthor">
      <figure v-if="author.coverImageUrl" class="author-cover">
        <img :src="author.coverImageUrl" :alt="`Большое фото автора ${author.displayName || author.login}`"/>
        <figcaption>Большое фото автора</figcaption>
      </figure>
      <div class="profile-hero">
        <div class="portrait"><img v-if="author.avatarUrl" :src="author.avatarUrl" :alt="author.displayName"><span
            v-else>{{ authorInitial }}</span></div>
        <div><p class="author-profile-kicker">Публичная страница автора</p>
          <h1>{{ author.displayName || author.login }}</h1>
          <p class="profile-meta">@{{ author.login }} · {{ author.city || 'Littop' }} · на сайте с
            {{ formatDate(author.registeredAt) }}</p>
          <p>{{ excerptText(author.bio, 240) || 'Автор пока не добавил биографию.' }}</p></div>
        <div class="profile-hero-actions">
          <a v-if="author.websiteUrl" class="btn btn-primary" :href="author.websiteUrl" target="_blank" rel="noreferrer">{{ profileLinkLabel }}</a>
          <RouterLink v-if="canMessageAuthor" class="btn btn-outline" :to="messageAuthorLocation">✉ Написать сообщение</RouterLink>
          <RouterLink v-else-if="!isAuthenticated" class="btn btn-outline" to="/messages">✉ Войти, чтобы написать</RouterLink>
        </div>
      </div>
      <section class="statgrid">
        <div class="s"><b>{{ author.ratingTotal }}</b><small>рейтинг автора</small></div>
        <div class="s"><b>{{ authorWorks.length || author.worksCountCached }}</b><small>произведений</small></div>
        <div class="s"><b>{{
            author.isFeatured ? '★' : '—'
          }}</b><small>{{ author.isFeatured ? 'автор витрины' : 'статус автора' }}</small></div>
        <div class="s"><b>{{
            author.isClassic ? '✓' : '—'
          }}</b><small>{{ author.isClassic ? 'классик' : 'публичный профиль' }}</small></div>
      </section>
      <nav class="profile-tabs"><a class="active">Произведения</a><a>Об авторе</a></nav>
      <section>
        <div class="section-title">
          <div><span class="catalog-kicker">Авторская лента</span>
            <h2>Произведения</h2></div>
          <small>{{ worksLoading ? 'обновляем…' : `${workRows.length} публикаций` }}</small></div>
        <div v-if="workRows.length" class="work-list">
          <article v-for="work in workRows" :key="work.id" class="work-row"><span class="work-kind">{{ work.order }} · {{
              formatWorkSection(work.sectionCode)
            }}</span>
            <div>
              <RouterLink :to="buildWorkPageLocation(work)"><b>{{ work.title }}</b></RouterLink>
              <small>{{ work.metaLine }}</small>
              <p>{{ excerptText(work.summary || work.excerpt || work.body, 170) }}</p></div>
            <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(work)">Читать</RouterLink>
          </article>
        </div>
        <div v-else-if="!worksLoading" class="catalog-empty"><h2>Публикаций пока нет</h2>
          <p>Автор ещё не добавил произведения.</p></div>
      </section>
    </section>
  </main>
</template>
