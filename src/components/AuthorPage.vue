<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_DETAILS_QUERY, AUTHOR_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatDateTime, formatWorkSection } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { setDocumentTitle } from '../lib/pageTitle.js';

const route = useRoute();

const author = ref(null);
const authorWorks = ref([]);
const writtenReviews = ref([]);
const receivedReviews = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');
const activeLedger = ref('works');

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

const writtenReviewRows = computed(() => writtenReviews.value.map((item, index) => ({
  ...item,
  order: index + 1,
  counterpartName: item.workAuthor?.displayName || item.workAuthor?.login || 'Автор не найден',
  counterpartLink: item.workAuthor?.login ? buildAuthorPageLocation(item.workAuthor) : null,
  metaLine: `Кому: ${item.workAuthor?.displayName || item.workAuthor?.login || 'автору'} · ${formatDateTime(item.updatedAt || item.createdAt)}`,
})));

const receivedReviewRows = computed(() => receivedReviews.value.map((item, index) => ({
  ...item,
  order: index + 1,
  counterpartName: item.commentAuthor?.displayName || item.commentAuthor?.login || 'Автор не найден',
  counterpartLink: item.commentAuthor?.login ? buildAuthorPageLocation(item.commentAuthor) : null,
  metaLine: `От: ${item.commentAuthor?.displayName || item.commentAuthor?.login || 'автора'} · ${formatDateTime(item.updatedAt || item.createdAt)}`,
})));

const activeSectionTitle = computed(() => {
  if (activeLedger.value === 'written') return 'Написанные отзывы';
  if (activeLedger.value === 'received') return 'Полученные отзывы';
  return 'Произведения';
});

const activeSectionEyebrow = computed(() => {
  if (activeLedger.value === 'written') return 'Что автор пишет другим';
  if (activeLedger.value === 'received') return 'Что пишут автору';
  return 'Авторская лента';
});

const activeCount = computed(() => {
  if (activeLedger.value === 'written') return writtenReviewRows.value.length;
  if (activeLedger.value === 'received') return receivedReviewRows.value.length;
  return workRows.value.length;
});

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
  writtenReviews.value = [];
  receivedReviews.value = [];
  pageError.value = '';
  activeLedger.value = 'works';

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
      await loadAuthorDetails(login, author.value.id);
    }
  } catch (queryError) {
    pageError.value = queryError.message;
  } finally {
    pageLoading.value = false;
  }
}

async function loadAuthorDetails(login, authorId) {
  worksLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: AUTHOR_DETAILS_QUERY,
      variables: {
        login,
        authorId,
      },
      fetchPolicy: 'network-only',
    });

    author.value = data?.author ?? author.value;
    authorWorks.value = data?.works ?? [];
    writtenReviews.value = data?.writtenReviews ?? [];
    receivedReviews.value = data?.receivedReviews ?? [];
  } catch (queryError) {
    pageError.value = queryError.message;
    authorWorks.value = [];
    writtenReviews.value = [];
    receivedReviews.value = [];
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
        <p class="muted">Публичная авторская страница с произведениями, полученными отзывами и рецензиями, которые автор написал другим.</p>
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

          <div class="stack">
            <button class="btn" :class="activeLedger === 'works' ? 'btn-primary' : 'btn-outline'" type="button" @click="activeLedger = 'works'">
              ПРОИЗВЕДЕНИЯ
            </button>
            <button class="btn" :class="activeLedger === 'written' ? 'btn-primary' : 'btn-outline'" type="button" @click="activeLedger = 'written'">
              НАПИСАННЫЕ
            </button>
            <button class="btn" :class="activeLedger === 'received' ? 'btn-primary' : 'btn-outline'" type="button" @click="activeLedger = 'received'">
              ПОЛУЧЕННЫЕ
            </button>
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
              <div class="author-paper-eyebrow">{{ activeSectionEyebrow }}</div>
              <h3 class="author-paper-title author-paper-title-sm">{{ activeSectionTitle }}</h3>
            </div>
            <span class="author-counter">{{ worksLoading ? 'обновляем…' : `${activeCount} записей` }}</span>
          </div>

          <ol v-if="activeLedger === 'works' && workRows.length" class="author-works-ledger">
            <li v-for="work in workRows" :key="work.id" class="author-works-ledger-item">
              <div class="author-work-order">{{ work.order }}.</div>
              <div class="author-work-body">
                <RouterLink class="author-work-title" :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink>
                <div class="author-work-meta">{{ work.metaLine }}</div>
                <div class="author-work-excerpt">{{ excerptText(work.summary || work.excerpt || work.body, 260) }}</div>
              </div>
            </li>
          </ol>

          <ol v-else-if="activeLedger === 'written' && writtenReviewRows.length" class="author-works-ledger">
            <li v-for="review in writtenReviewRows" :key="`written-${review.id}`" class="author-works-ledger-item">
              <div class="author-work-order">{{ review.order }}.</div>
              <div class="author-work-body">
                <RouterLink class="author-work-title" :to="buildWorkPageLocation({ id: review.workId, slug: review.workSlug })">{{ review.workTitle }}</RouterLink>
                <div class="author-work-meta">
                  <template v-if="review.counterpartLink">
                    Кому: <RouterLink :to="review.counterpartLink">{{ review.counterpartName }}</RouterLink>
                  </template>
                  <template v-else>
                    {{ review.metaLine }}
                  </template>
                  <span v-if="review.counterpartLink"> · {{ formatDateTime(review.updatedAt || review.createdAt) }}</span>
                </div>
                <div class="author-work-excerpt">{{ excerptText(review.body, 260) }}</div>
              </div>
            </li>
          </ol>

          <ol v-else-if="activeLedger === 'received' && receivedReviewRows.length" class="author-works-ledger">
            <li v-for="review in receivedReviewRows" :key="`received-${review.id}`" class="author-works-ledger-item">
              <div class="author-work-order">{{ review.order }}.</div>
              <div class="author-work-body">
                <RouterLink class="author-work-title" :to="buildWorkPageLocation({ id: review.workId, slug: review.workSlug })">{{ review.workTitle }}</RouterLink>
                <div class="author-work-meta">
                  <template v-if="review.counterpartLink">
                    От: <RouterLink :to="review.counterpartLink">{{ review.counterpartName }}</RouterLink>
                  </template>
                  <template v-else>
                    {{ review.metaLine }}
                  </template>
                  <span v-if="review.counterpartLink"> · {{ formatDateTime(review.updatedAt || review.createdAt) }}</span>
                </div>
                <div class="author-work-excerpt">{{ excerptText(review.body, 260) }}</div>
              </div>
            </li>
          </ol>

          <div v-else-if="!worksLoading" class="empty-state author-empty-ledger">
            <template v-if="activeLedger === 'works'">У этого автора пока нет опубликованных произведений.</template>
            <template v-else-if="activeLedger === 'written'">Автор пока не написал отзывов другим авторам.</template>
            <template v-else>Этому автору пока никто не написал отзывов.</template>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
