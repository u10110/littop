<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import { uploadProfileImage } from '../lib/profileImages.js';
import { ADMIN_CREATE_WORK_MUTATION, ADMIN_UPDATE_AUTHOR_PROFILE_MUTATION, AUTHOR_DETAILS_QUERY, AUTHOR_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatDateTime, formatWorkSection } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { setDocumentTitle } from '../lib/pageTitle.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const { bootstrapSession, currentUser } = useSession();

const author = ref(null);
const authorWorks = ref([]);
const writtenReviews = ref([]);
const receivedReviews = ref([]);
const pageLoading = ref(false);
const worksLoading = ref(false);
const pageError = ref('');
const activeLedger = ref('works');
const adminProfileBusy = ref(false);
const adminProfileStatus = ref('');
const adminProfileError = ref('');
const adminWorkBusy = ref(false);
const adminWorkStatus = ref('');
const adminWorkError = ref('');
const adminImageBusy = ref(false);
const adminImageStatus = ref('');
const adminImageError = ref('');
const adminProfileForm = ref({
  displayName: '',
  city: '',
  websiteUrl: '',
  bio: '',
  avatarUrl: '',
  coverImageUrl: '',
});
const adminWorkForm = ref({
  sectionCode: 'poetry',
  title: '',
  summary: '',
  body: '',
  projectFormat: '',
});

const authorLogin = computed(() => normalizeRouteParam(route.params.login));
const hasAuthor = computed(() => Boolean(author.value));
const notFound = computed(() => !pageLoading.value && !pageError.value && Boolean(authorLogin.value) && !author.value);
const isAdmin = computed(() => currentUser.value?.role === 'admin');
const canManageClassic = computed(() => Boolean(isAdmin.value && author.value?.isClassic));
const projectFormats = [
  { value: '', label: 'Без уточнения' },
  { value: 'song', label: 'Песня' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'stage_production', label: 'Постановка' },
  { value: 'screenplay', label: 'Киносценарий' },
  { value: 'other', label: 'Другое' },
];

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

onMounted(() => {
  bootstrapSession();
});

watch(author, (value) => {
  adminProfileForm.value = {
    displayName: value?.displayName || '',
    city: value?.city || '',
    websiteUrl: value?.websiteUrl || '',
    bio: value?.bio || '',
    avatarUrl: value?.avatarUrl || '',
    coverImageUrl: value?.coverImageUrl || '',
  };
  adminProfileStatus.value = '';
  adminProfileError.value = '';
  adminImageStatus.value = '';
  adminImageError.value = '';
  adminWorkStatus.value = '';
  adminWorkError.value = '';
}, { immediate: true });

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

function normalizeOptional(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function buildExcerpt(summary, body) {
  const preferred = normalizeOptional(summary);
  if (preferred) return preferred;
  const normalizedBody = normalizeOptional(body);
  if (!normalizedBody) return null;
  return normalizedBody.slice(0, 280);
}

async function refreshAuthorDetails() {
  if (!authorLogin.value || !author.value?.id) return;
  await loadAuthorDetails(authorLogin.value, author.value.id);
}

async function submitAdminProfile() {
  if (!author.value?.id || !canManageClassic.value) return;
  adminProfileBusy.value = true;
  adminProfileStatus.value = '';
  adminProfileError.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: ADMIN_UPDATE_AUTHOR_PROFILE_MUTATION,
      variables: {
        authorId: author.value.id,
        input: {
          displayName: adminProfileForm.value.displayName.trim(),
          city: normalizeOptional(adminProfileForm.value.city),
          websiteUrl: normalizeOptional(adminProfileForm.value.websiteUrl),
          bio: normalizeOptional(adminProfileForm.value.bio),
          avatarUrl: normalizeOptional(adminProfileForm.value.avatarUrl),
          coverImageUrl: normalizeOptional(adminProfileForm.value.coverImageUrl),
        },
      },
    });
    author.value = data?.adminUpdateAuthorProfile ?? author.value;
    adminProfileStatus.value = 'Страница классика обновлена.';
    await refreshAuthorDetails();
  } catch (error) {
    adminProfileError.value = error.message;
  } finally {
    adminProfileBusy.value = false;
  }
}

async function uploadAdminImage(kind, event) {
  if (!canManageClassic.value) return;
  const file = event?.target?.files?.[0] ?? null;
  if (!file) return;

  adminImageBusy.value = true;
  adminImageStatus.value = '';
  adminImageError.value = '';

  try {
    const imageUrl = await uploadProfileImage({ kind, file });
    if (kind === 'avatar') {
      adminProfileForm.value.avatarUrl = imageUrl;
      adminImageStatus.value = 'Новая фотография-аватар загружена. Сохрани страницу классика, чтобы применить её.';
    } else {
      adminProfileForm.value.coverImageUrl = imageUrl;
      adminImageStatus.value = 'Новое большое фото загружено. Сохрани страницу классика, чтобы применить его.';
    }
  } catch (error) {
    adminImageError.value = error.message;
  } finally {
    adminImageBusy.value = false;
    if (event?.target) {
      event.target.value = '';
    }
  }
}

async function submitAdminWork() {
  if (!author.value?.id || !canManageClassic.value) return;
  adminWorkBusy.value = true;
  adminWorkStatus.value = '';
  adminWorkError.value = '';

  try {
    await apolloClient.mutate({
      mutation: ADMIN_CREATE_WORK_MUTATION,
      variables: {
        authorId: author.value.id,
        input: {
          sectionCode: adminWorkForm.value.sectionCode,
          title: adminWorkForm.value.title.trim(),
          summary: normalizeOptional(adminWorkForm.value.summary),
          body: normalizeOptional(adminWorkForm.value.body),
          excerpt: buildExcerpt(adminWorkForm.value.summary, adminWorkForm.value.body),
          projectFormat: adminWorkForm.value.sectionCode === 'project' ? normalizeOptional(adminWorkForm.value.projectFormat) : null,
        },
      },
    });
    adminWorkForm.value = {
      sectionCode: 'poetry',
      title: '',
      summary: '',
      body: '',
      projectFormat: '',
    };
    activeLedger.value = 'works';
    adminWorkStatus.value = 'Произведение для классика опубликовано.';
    await refreshAuthorDetails();
  } catch (error) {
    adminWorkError.value = error.message;
  } finally {
    adminWorkBusy.value = false;
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

        <article v-if="canManageClassic" class="panel stack">
          <div class="section-head">
            <div>
              <div class="author-paper-eyebrow">Админ-режим классика</div>
              <h3 class="author-paper-title author-paper-title-sm">Редактирование страницы и публикаций</h3>
            </div>
            <span class="pill warn">только для администратора</span>
          </div>

          <form class="stack" @submit.prevent="submitAdminProfile">
            <div class="grid-2">
              <div class="field">
                <label for="classic-display-name">Имя автора</label>
                <input id="classic-display-name" v-model="adminProfileForm.displayName" class="input" required />
              </div>
              <div class="field">
                <label for="classic-city">Город</label>
                <input id="classic-city" v-model="adminProfileForm.city" class="input" />
              </div>
            </div>

            <div class="field">
              <label for="classic-website">Ссылка автора</label>
              <input id="classic-website" v-model="adminProfileForm.websiteUrl" class="input" placeholder="https://..." />
            </div>

            <div class="field">
              <label for="classic-bio">Биография</label>
              <textarea id="classic-bio" v-model="adminProfileForm.bio" class="textarea" />
            </div>

            <div class="profile-image-grid">
              <div class="profile-image-card">
                <strong>Аватар</strong>
                <div class="field">
                  <label for="classic-avatar-url">URL аватара</label>
                  <input id="classic-avatar-url" v-model="adminProfileForm.avatarUrl" class="input" placeholder="https://..." />
                </div>
                <div class="field">
                  <label for="classic-avatar-upload">Загрузить аватар</label>
                  <input id="classic-avatar-upload" class="input" type="file" accept="image/*" :disabled="adminImageBusy" @change="uploadAdminImage('avatar', $event)" />
                </div>
              </div>

              <div class="profile-image-card">
                <strong>Большое фото</strong>
                <div class="field">
                  <label for="classic-cover-url">URL большого фото</label>
                  <input id="classic-cover-url" v-model="adminProfileForm.coverImageUrl" class="input" placeholder="https://..." />
                </div>
                <div class="field">
                  <label for="classic-cover-upload">Загрузить большое фото</label>
                  <input id="classic-cover-upload" class="input" type="file" accept="image/*" :disabled="adminImageBusy" @change="uploadAdminImage('cover', $event)" />
                </div>
              </div>
            </div>

            <div v-if="adminImageStatus" class="message success">{{ adminImageStatus }}</div>
            <div v-if="adminImageError" class="message error">{{ adminImageError }}</div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="adminProfileBusy">{{ adminProfileBusy ? 'Сохраняем…' : 'Сохранить страницу классика' }}</button>
            </div>
            <div v-if="adminProfileStatus" class="message success">{{ adminProfileStatus }}</div>
            <div v-if="adminProfileError" class="message error">{{ adminProfileError }}</div>
          </form>

          <form class="stack" @submit.prevent="submitAdminWork">
            <div class="section-head">
              <h3 class="author-paper-title author-paper-title-sm">Добавить произведение</h3>
              <span class="pill">от имени классика</span>
            </div>
            <div class="grid-2">
              <div class="field">
                <label for="classic-work-section">Раздел</label>
                <select id="classic-work-section" v-model="adminWorkForm.sectionCode" class="select">
                  <option value="poetry">Поэзия</option>
                  <option value="prose">Проза</option>
                  <option value="project">Творческий проект</option>
                </select>
              </div>
              <div v-if="adminWorkForm.sectionCode === 'project'" class="field">
                <label for="classic-work-project-format">Формат проекта</label>
                <select id="classic-work-project-format" v-model="adminWorkForm.projectFormat" class="select">
                  <option v-for="option in projectFormats" :key="option.value || 'default'" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="classic-work-title">Название произведения</label>
              <input id="classic-work-title" v-model="adminWorkForm.title" class="input" required />
            </div>
            <div class="field">
              <label for="classic-work-summary">Краткое описание</label>
              <textarea id="classic-work-summary" v-model="adminWorkForm.summary" class="textarea" />
            </div>
            <div class="field">
              <label for="classic-work-body">Текст произведения</label>
              <textarea id="classic-work-body" v-model="adminWorkForm.body" class="textarea" />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="adminWorkBusy">{{ adminWorkBusy ? 'Публикуем…' : 'Опубликовать произведение' }}</button>
            </div>
            <div v-if="adminWorkStatus" class="message success">{{ adminWorkStatus }}</div>
            <div v-if="adminWorkError" class="message error">{{ adminWorkError }}</div>
          </form>
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
