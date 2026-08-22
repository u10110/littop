<script setup>
import {computed, ref, watch} from 'vue';
import {RouterLink, useRoute} from 'vue-router';

import {apolloClient} from '../lib/apollo.js';
import {useSession} from '../lib/session.js';
import {AUTHOR_QUERY, AUTHOR_WORK_GROUPS_QUERY, WORKS_QUERY} from '../lib/graphql.js';
import {excerptText, formatDate, formatDateTime, formatWorkSection} from '../lib/format.js';
import {buildWorkPageLocation, normalizeRouteParam} from '../lib/routes.js';
import {setDocumentTitle} from '../lib/pageTitle.js';
import {authorAvatarUrl} from '../lib/authorAvatar.js';

const route = useRoute();
const {isAuthenticated, currentUser} = useSession();

const author = ref(null);
const authorWorks = ref([]);
const authorWorkGroups = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');
const coverIsPortrait = ref(false);
const expandedWorkGroups = ref(new Set());

const authorLogin = computed(() => normalizeRouteParam(route.params.login));
const hasAuthor = computed(() => Boolean(author.value));
const authorMessageBlocked = computed(() => Boolean(author.value?.isClassic || author.value?.isMemorialPage || author.value?.canReceivePrivateMessages === false));
const canMessageAuthor = computed(() => isAuthenticated.value && !authorMessageBlocked.value && Boolean(author.value?.id) && String(author.value.id) !== String(currentUser.value?.id));
const messageAuthorLocation = computed(() => ({ path: '/messages', query: { to: author.value?.login } }));
const notFound = computed(() => !pageLoading.value && !pageError.value && Boolean(authorLogin.value) && !author.value);

const authorInitial = computed(() => {
  const source = String(author.value?.displayName || author.value?.login || '').trim();
  return source ? source[0].toUpperCase() : 'А';
});

const authorResourceLinks = computed(() => Array.isArray(author.value?.profileLinks)
  ? author.value.profileLinks.filter((link) => String(link?.label || '').trim() && String(link?.url || '').trim())
  : []);

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

function buildWorkMeta(work) {
  const parts = [formatWorkSection(work.sectionCode)];
  if (Number(work.averageRating) > 0 || Number(work.ratingsCount) > 0) parts.push(`рейтинг ${Number(work.averageRating || 0).toFixed(1)}`);
  if (Number(work.commentsCount) > 0) parts.push(`отзывов ${work.commentsCount}`);
  parts.push(`опубл. ${formatDateTime(work.publishedAt || work.createdAt)}`);
  return parts.join(' / ');
}
const groupedWorkSections = computed(() => {
  const groupedIds = new Set();
  const groups = [...authorWorkGroups.value].sort((a,b) => Number(a.position ?? 0)-Number(b.position ?? 0)).map((group, groupIndex) => ({
    ...group, order: groupIndex + 1,
    works: (Array.isArray(group.works) ? group.works : []).map((work,index) => { groupedIds.add(String(work.id)); return {...work, order:index+1, metaLine:buildWorkMeta(work)}; }),
  }));
  const ungrouped = authorWorks.value.filter(work => !groupedIds.has(String(work.id))).map((work,index) => ({...work, order:index+1, metaLine:buildWorkMeta(work)}));
  if (ungrouped.length) groups.push({id:'ungrouped',name:'Без группы',description:'Отдельные публикации',position:Number.MAX_SAFE_INTEGER,isCollapsed:false,order:groups.length+1,works:ungrouped});
  return groups;
});
const publicationCount = computed(() => groupedWorkSections.value.reduce((total,group) => total + group.works.length, 0));
function isWorkGroupExpanded(group) { return expandedWorkGroups.value.has(String(group.id)); }
function toggleWorkGroup(group) { const key=String(group.id); const next=new Set(expandedWorkGroups.value); if(next.has(key)) next.delete(key); else next.add(key); expandedWorkGroups.value=next; }


watch(authorLogin, (login) => {
  loadAuthorPage(login);
}, {immediate: true});

async function loadAuthorPage(login) {
  author.value = null;
  authorWorks.value = [];
  authorWorkGroups.value = [];
  expandedWorkGroups.value = new Set();
  pageError.value = '';
  coverIsPortrait.value = false;

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
    detectCoverOrientation(author.value?.coverImageUrl);
    setDocumentTitle(author.value?.displayName || author.value?.login || 'Автор');

    if (author.value?.id) {
      await Promise.all([loadAuthorWorks(author.value.id), loadAuthorWorkGroups(author.value.id)]);
    }
  } catch (queryError) {
    pageError.value = queryError.message;
  } finally {
    pageLoading.value = false;
  }
}

function detectCoverOrientation(url) {
  if (!url) return;
  const image = new Image();
  image.onload = () => {
    coverIsPortrait.value = image.naturalHeight > image.naturalWidth * 1.08;
  };
  image.src = url;
}

async function loadAuthorWorkGroups(authorId) {
  try {
    const {data} = await apolloClient.query({ query: AUTHOR_WORK_GROUPS_QUERY, variables: { authorId }, fetchPolicy: 'network-only' });
    authorWorkGroups.value = data?.authorWorkGroups ?? [];
    expandedWorkGroups.value = new Set(authorWorkGroups.value.filter(group => !group.isCollapsed).map(group => String(group.id)));
  } catch (queryError) {
    pageError.value = queryError.message;
    authorWorkGroups.value = [];
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
      <figure v-if="author.coverImageUrl && !coverIsPortrait" class="author-cover">
        <img :src="author.coverImageUrl" :alt="`Большое фото автора ${author.displayName || author.login}`"/>
        <figcaption>Большое фото автора</figcaption>
      </figure>
      <div class="author-page-layout" :class="{ 'author-page-layout-with-portrait': coverIsPortrait }">
        <div class="author-page-main">
          <div class="profile-hero">
        <div class="portrait"><img :src="authorAvatarUrl(author)" :alt="author.displayName || author.login"></div>
        <div><p class="author-profile-kicker">Публичная страница автора</p>
          <h1>{{ author.displayName || author.login }}</h1>
          <p class="profile-meta">@{{ author.login }} · {{ author.city || 'Littop' }} · на сайте с
            {{ formatDate(author.registeredAt) }}</p>
          <p>{{ excerptText(author.bio, 240) || 'Автор пока не добавил биографию.' }}</p></div>
        <div class="profile-hero-actions">
          <div v-if="author.websiteUrl || authorResourceLinks.length" class="author-resource-links">
            <a v-if="author.websiteUrl" class="btn btn-primary" :href="author.websiteUrl" target="_blank" rel="noreferrer">{{ profileLinkLabel }}</a>
            <a v-for="link in authorResourceLinks" :key="`${link.label}-${link.url}`" class="btn btn-outline" :href="link.url" target="_blank" rel="noreferrer noopener">{{ link.label }}</a>
          </div>
          <RouterLink v-if="canMessageAuthor" class="btn btn-outline" :to="messageAuthorLocation">✉ Написать сообщение</RouterLink>
          <span v-else-if="authorMessageBlocked" class="profile-message-unavailable">Личные сообщения недоступны</span>
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
          <small>{{ worksLoading ? 'обновляем…' : `${publicationCount} публикаций` }}</small></div>
        <div v-if="groupedWorkSections.length" class="author-works-table">
          <div class="author-works-table-head" role="row">
            <span>Название / структура</span><span>Раздел</span><span>Рейтинг</span><span>Опубликовано</span><span aria-hidden="true"></span>
          </div>
          <section v-for="group in groupedWorkSections" :key="group.id" class="author-works-group" :class="{ 'is-collapsed': !isWorkGroupExpanded(group) }">
            <button class="author-works-group-head" type="button" :aria-expanded="isWorkGroupExpanded(group)" @click="toggleWorkGroup(group)">
              <span class="author-works-group-level">{{ group.order }}</span>
              <span class="author-works-group-title"><b>{{ group.name }}</b><small>{{ group.description || 'Подборка произведений' }}</small></span>
              <span class="author-works-group-count">{{ group.works.length }} {{ group.works.length === 1 ? 'произведение' : group.works.length < 5 ? 'произведения' : 'произведений' }}</span>
              <span></span><span></span><span class="author-works-group-toggle" aria-hidden="true">⌃</span>
            </button>
            <div v-if="isWorkGroupExpanded(group)" class="author-works-group-items">
              <article v-for="work in group.works" :key="work.id" class="author-works-row">
                <div class="author-works-title"><RouterLink :to="buildWorkPageLocation(work)"><b>{{ group.order }}.{{ work.order }} · {{ work.title }}</b></RouterLink><small>{{ excerptText(work.summary || work.excerpt || work.body, 150) }}</small></div>
                <span class="author-works-section">{{ formatWorkSection(work.sectionCode) }}</span>
                <span class="author-works-rating">{{ Number(work.averageRating) > 0 || Number(work.ratingsCount) > 0 ? `★ ${Number(work.averageRating || 0).toFixed(1)} · ${work.commentsCount || 0}` : '—' }}</span>
                <span class="author-works-date">{{ formatDate(work.publishedAt || work.createdAt) }}</span>
                <RouterLink class="author-works-read" :to="buildWorkPageLocation(work)" :aria-label="`Читать: ${work.title}`">→</RouterLink>
              </article>
            </div>
          </section>
        </div>
        <div v-else-if="!worksLoading" class="catalog-empty"><h2>Публикаций пока нет</h2>
          <p>Автор ещё не добавил произведения.</p></div>
      </section>
        </div>
        <aside v-if="author.coverImageUrl && coverIsPortrait" class="author-page-portrait-sidebar">
          <figure class="author-side-cover">
            <img :src="author.coverImageUrl" :alt="`Фото автора ${author.displayName || author.login}`">
            <figcaption>Фото автора</figcaption>
          </figure>
        </aside>
      </div>
    </section>
  </main>
</template>
