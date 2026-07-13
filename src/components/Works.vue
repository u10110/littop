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
  WORK_VIEWERS_QUERY,
} from '../lib/graphql.js';
import { formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { flattenThreadTree } from '../lib/discussion.js';
import { uploadForumPostImage } from '../lib/forumImages.js';
import { getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();

const sectionFilter = ref('');
const search = ref('');
const mineOnly = ref(false);
const todayOnly = ref(false);
const selectedWorkId = ref(null);
const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentText = ref('');
const commentImageFile = ref(null);
const commentBusy = ref(false);
const commentStatus = ref('');
const replyTargetId = ref(null);
const replyText = ref('');
const replyImageFile = ref(null);
const viewers = ref([]);
const viewersLoading = ref(false);
const viewersError = ref('');
const viewersVisible = ref(false);
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

function normalizeTodayQuery(value) {
  const normalized = takeQueryValue(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'today'].includes(normalized);
}

function applyFiltersFromQuery(query) {
  sectionFilter.value = normalizeSectionQuery(query.section);
  search.value = normalizeSearchQuery(query.search);
  mineOnly.value = normalizeMineQuery(query.mine);
  todayOnly.value = normalizeTodayQuery(query.today);
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

  if (todayOnly.value) {
    nextQuery.today = '1';
  } else {
    delete nextQuery.today;
  }

  return nextQuery;
}

function managedQuerySnapshot(query) {
  return JSON.stringify({
    section: normalizeSectionQuery(query.section),
    search: normalizeSearchQuery(query.search),
    mine: normalizeMineQuery(query.mine),
    today: normalizeTodayQuery(query.today),
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

watch([sectionFilter, search, mineOnly, todayOnly], () => {
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
  createdToday: todayOnly.value || null,
}));

const { result, loading, error, refetch } = useQuery(WORKS_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const works = computed(() => result.value?.works ?? []);
const selectedWork = computed(() => works.value.find((item) => String(item.id) === String(selectedWorkId.value)) ?? null);
const flatComments = computed(() => flattenThreadTree(comments.value, 'parentCommentId'));
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

  if (todayOnly.value) {
    pills.push('произведения за сегодня');
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
    viewers.value = [];
    viewersVisible.value = false;
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedWorkId.value));
  if (!stillExists) {
    selectedWorkId.value = items[0].id;
  }
}, { immediate: true });

watch(selectedWorkId, (workId) => {
  replyTargetId.value = null;
  replyText.value = '';
  replyImageFile.value = null;
  viewers.value = [];
  viewersError.value = '';
  viewersVisible.value = false;
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

async function loadViewers(workId) {
  viewersLoading.value = true;
  viewersError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: WORK_VIEWERS_QUERY,
      variables: { workId, limit: 100 },
      fetchPolicy: 'network-only',
    });
    viewers.value = data?.workViewers ?? [];
  } catch (queryError) {
    viewers.value = [];
    viewersError.value = queryError.message;
  } finally {
    viewersLoading.value = false;
  }
}

async function toggleViewers() {
  viewersVisible.value = !viewersVisible.value;
  if (viewersVisible.value && selectedWork.value?.id) {
    await loadViewers(selectedWork.value.id);
  }
}

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function authorInitial(author) {
  return getAuthorInitial(author);
}

function commentDepthStyle(comment) {
  return {
    '--forum-depth': Math.min(Math.max(Number(comment?.depth) || 0, 0), 6),
  };
}

function handleCommentImageChange(event) {
  commentImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleReplyImageChange(event) {
  replyImageFile.value = event?.target?.files?.[0] ?? null;
}

function startReply(comment) {
  replyTargetId.value = comment?.id ?? null;
  replyText.value = '';
  replyImageFile.value = null;
  commentStatus.value = '';
}

function cancelReply() {
  replyTargetId.value = null;
  replyText.value = '';
  replyImageFile.value = null;
}

async function resolveUploadedImageUrl(file) {
  if (file instanceof File) {
    return uploadForumPostImage({ file });
  }
  return null;
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
    const imageUrl = await resolveUploadedImageUrl(commentImageFile.value);
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: selectedWork.value.id,
        body: commentText.value.trim(),
        parentCommentId: null,
        imageUrl,
      },
    });
    commentText.value = '';
    commentImageFile.value = null;
    commentStatus.value = imageUrl ? 'Комментарий с картинкой опубликован.' : 'Комментарий опубликован.';
    await Promise.all([refetch(), loadComments(selectedWork.value.id), viewersVisible.value ? loadViewers(selectedWork.value.id) : Promise.resolve()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function submitReply(comment) {
  if (!selectedWork.value || !comment?.id) return;
  commentBusy.value = true;
  commentStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(replyImageFile.value);
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: selectedWork.value.id,
        body: replyText.value.trim(),
        parentCommentId: comment.id,
        imageUrl,
      },
    });
    replyTargetId.value = null;
    replyText.value = '';
    replyImageFile.value = null;
    commentStatus.value = imageUrl ? 'Ответ с картинкой опубликован.' : 'Ответ опубликован.';
    await Promise.all([refetch(), loadComments(selectedWork.value.id), viewersVisible.value ? loadViewers(selectedWork.value.id) : Promise.resolve()]);
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
  todayOnly.value = false;
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
          <button class="btn" :class="todayOnly ? 'btn-primary' : 'btn-outline'" type="button" @click="todayOnly = !todayOnly">
            {{ todayOnly ? 'За сегодня' : 'Произведения за сегодня' }}
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

      <ul v-if="works.length" class="work-list">
        <li
          v-for="work in works"
          :key="work.id"
          class="work-list-row"
          :class="{ 'is-selected': String(work.id) === String(selectedWorkId) }"
          @click="selectedWorkId = work.id"
        >
          <RouterLink class="work-list-title" :to="buildWorkPageLocation(work)" @click.stop>{{ work.title }}</RouterLink>
          <span class="work-list-meta">
            <RouterLink v-if="work.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(work.author)" @click.stop>{{ work.author?.displayName || work.author?.login }}</RouterLink>
            <template v-else>{{ work.author?.displayName || work.author?.login }}</template>
            <span class="work-list-dot">·</span>{{ formatWorkSection(work.sectionCode) }}
            <span class="work-list-dot">·</span>{{ formatDate(work.publishedAt || work.createdAt) }}
          </span>
        </li>
      </ul>
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
          <button class="btn btn-outline" type="button" @click="toggleViewers">
            {{ viewersVisible ? 'Скрыть список просмотров' : 'Список просмотров' }}
          </button>
          <RouterLink class="btn btn-outline" :to="buildWorkPageLocation(selectedWork)">Публичная страница произведения</RouterLink>
        </div>

        <div v-if="selectedWork.body" class="prewrap" v-html="selectedWork.body" />
        <div v-else-if="selectedWork.summary" class="prewrap" v-html="selectedWork.summary" />
        <div v-else-if="selectedWork.excerpt" class="prewrap" v-html="selectedWork.excerpt" />
        <div v-else class="prewrap">Текст пока не добавлен.</div>

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
            <div class="field">
              <label for="new-comment-image">Картинка к комментарию</label>
              <input id="new-comment-image" class="input" type="file" accept="image/*" @change="handleCommentImageChange" />
            </div>
            <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать комментарий' }}</button>
            <div v-if="commentStatus" class="message" :class="commentStatus.includes('опубликован') || commentStatus.includes('Ответ') ? 'success' : 'error'">{{ commentStatus }}</div>
          </form>
        </div>
        <div v-else class="message">Чтобы ставить оценки и оставлять комментарии, войди или зарегистрируйся в шапке.</div>

        <hr class="divider" />

        <div class="section-head">
          <h3>Комментарии</h3>
          <span class="pill">{{ commentsLoading ? 'обновляем…' : `${comments.length} записей` }}</span>
        </div>
        <div v-if="commentsError" class="message error">{{ commentsError }}</div>
        <div v-if="viewersVisible" class="panel stack">
          <div class="section-head">
            <h3>Список просмотров</h3>
            <span class="pill">{{ viewersLoading ? 'обновляем…' : `${viewers.length} записей` }}</span>
          </div>
          <div v-if="viewersError" class="message error">{{ viewersError }}</div>
          <div v-if="viewers.length" class="stack">
            <article v-for="viewer in viewers" :key="viewer.id" class="comment-item comment-item-rich">
              <div class="forum-post-avatar-wrap">
                <img v-if="viewer.viewer?.avatarUrl" :src="viewer.viewer.avatarUrl" class="forum-post-avatar" alt="avatar читателя" />
                <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(viewer.viewer) }}</div>
              </div>
              <div class="comment-item-body">
                <div class="forum-post-author-line">
                  <strong>
                    <RouterLink v-if="viewer.viewer?.login" class="user-inline-link" :to="buildAuthorPageLocation(viewer.viewer)">{{ authorLabel(viewer.viewer) }}</RouterLink>
                    <template v-else>{{ authorLabel(viewer.viewer) }}</template>
                  </strong>
                  <span class="meta">· {{ formatDate(viewer.viewedAt) }}</span>
                </div>
              </div>
            </article>
          </div>
          <div v-else-if="!viewersLoading" class="empty-state">Пока нет сохранённых просмотров авторизованных пользователей.</div>
        </div>

        <div v-if="flatComments.length" class="stack">
          <article v-for="comment in flatComments" :key="comment.id" class="comment-item-rich forum-thread-post" :style="commentDepthStyle(comment)">
            <div class="forum-post-avatar-wrap">
              <img v-if="comment.author?.avatarUrl" :src="comment.author.avatarUrl" class="forum-post-avatar" alt="avatar автора комментария" />
              <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(comment.author) }}</div>
            </div>
            <div class="comment-item-body">
              <div class="forum-post-author-line">
                <strong>
                  <RouterLink v-if="comment.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(comment.author)">{{ authorLabel(comment.author) }}</RouterLink>
                  <template v-else>{{ authorLabel(comment.author) }}</template>
                </strong>
                <span class="meta">· {{ formatDate(comment.createdAt) }}</span>
              </div>
              <div v-if="comment.replyToAuthor" class="forum-reply-note">Ответ пользователю {{ authorLabel(comment.replyToAuthor) }}</div>
              <div class="comment-body prewrap">{{ comment.body }}</div>
              <img v-if="comment.imageUrl" :src="comment.imageUrl" class="forum-post-image" alt="Картинка к комментарию" />
              <div v-if="isAuthenticated" class="inline-actions forum-post-actions">
                <button class="btn btn-outline" type="button" :disabled="commentBusy" @click="startReply(comment)">Ответить</button>
              </div>
              <form v-if="replyTargetId === comment.id" class="stack forum-inline-form" @submit.prevent="submitReply(comment)">
                <div class="field">
                  <label :for="`work-reply-comment-${comment.id}`">Ответить на комментарий</label>
                  <textarea :id="`work-reply-comment-${comment.id}`" v-model="replyText" class="textarea" required placeholder="Твой ответ" />
                </div>
                <div class="field">
                  <label :for="`work-reply-comment-image-${comment.id}`">Картинка к ответу</label>
                  <input :id="`work-reply-comment-image-${comment.id}`" class="input" type="file" accept="image/*" @change="handleReplyImageChange" />
                </div>
                <div class="inline-actions">
                  <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
                  <button class="btn btn-outline" type="button" :disabled="commentBusy" @click="cancelReply">Отмена</button>
                </div>
              </form>
            </div>
          </article>
        </div>
        <div v-else-if="!commentsLoading" class="empty-state">Пока без комментариев — можно начать обсуждение первым.</div>
      </article>

      <div v-else class="empty-state">Выбери произведение слева, чтобы увидеть полный текст, комментарии и действия.</div>
    </div>
  </section>
</template>
