<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import {
  ADD_WORK_COMMENT_MUTATION,
  RATE_WORK_MUTATION,
  WORK_COMMENTS_QUERY,
  WORK_QUERY,
} from '../lib/graphql.js';
import { formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const { isAuthenticated } = useSession();

const work = ref(null);
const workLoading = ref(false);
const workError = ref('');
const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentText = ref('');
const commentBusy = ref(false);
const commentStatus = ref('');
const ratingBusy = ref(false);
const ratingStatus = ref('');
let workRequestVersion = 0;

const slugOrId = computed(() => normalizeRouteParam(route.params.slugOrId));
const notFound = computed(() => !workLoading.value && !workError.value && Boolean(slugOrId.value) && !work.value);

watch(slugOrId, (value) => {
  loadWorkPage(value);
}, { immediate: true });

async function loadWorkPage(value) {
  const requestVersion = workRequestVersion + 1;
  workRequestVersion = requestVersion;
  work.value = null;
  comments.value = [];
  commentsError.value = '';
  workError.value = '';
  commentStatus.value = '';
  ratingStatus.value = '';

  if (!value) {
    return;
  }

  const loaded = await fetchWork(value, requestVersion);
  if (loaded?.id) {
    await loadComments(loaded.id, requestVersion);
  }
}

function currentLookupVariables(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { id: null, slug: null };
  }
  if (/^\d+$/.test(normalized)) {
    return { id: normalized, slug: null };
  }
  return { id: null, slug: normalized };
}

async function fetchWork(value, requestVersion = workRequestVersion) {
  workLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: WORK_QUERY,
      variables: currentLookupVariables(value),
      fetchPolicy: 'network-only',
    });

    if (requestVersion !== workRequestVersion) {
      return null;
    }

    work.value = data?.work ?? null;
    return work.value;
  } catch (queryError) {
    if (requestVersion === workRequestVersion) {
      work.value = null;
      workError.value = queryError.message;
    }
    return null;
  } finally {
    if (requestVersion === workRequestVersion) {
      workLoading.value = false;
    }
  }
}

async function loadComments(workId, requestVersion = workRequestVersion) {
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

    if (requestVersion !== workRequestVersion) {
      return;
    }

    comments.value = data?.workComments ?? [];
  } catch (queryError) {
    if (requestVersion === workRequestVersion) {
      comments.value = [];
      commentsError.value = queryError.message;
    }
  } finally {
    if (requestVersion === workRequestVersion) {
      commentsLoading.value = false;
    }
  }
}

async function refreshCurrentWork() {
  if (!slugOrId.value) {
    return;
  }
  await fetchWork(slugOrId.value);
}

async function submitRating(rating) {
  if (!work.value) return;
  ratingBusy.value = true;
  ratingStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: RATE_WORK_MUTATION,
      variables: {
        workId: work.value.id,
        rating,
      },
    });
    ratingStatus.value = `Оценка ${rating}/5 сохранена.`;
    await refreshCurrentWork();
  } catch (mutationError) {
    ratingStatus.value = mutationError.message;
  } finally {
    ratingBusy.value = false;
  }
}

async function submitComment() {
  if (!work.value) return;
  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: work.value.id,
        body: commentText.value.trim(),
        parentCommentId: null,
      },
    });
    commentText.value = '';
    commentStatus.value = 'Комментарий опубликован.';
    await Promise.all([
      refreshCurrentWork(),
      loadComments(work.value.id),
    ]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <div class="section-head">
      <div>
        <h1>Страница произведения</h1>
        <p class="muted">Полный текст, оценки и комментарии доступны по прямой публичной ссылке.</p>
      </div>
      <RouterLink class="btn btn-outline" to="/works">← К каталогу произведений</RouterLink>
    </div>
  </section>

  <div v-if="workError" class="message error">{{ workError }}</div>

  <section v-if="workLoading" class="panel stack">
    <div class="empty-state">Загружаем произведение…</div>
  </section>

  <section v-else-if="notFound" class="panel stack">
    <div class="empty-state">Произведение не найдено.</div>
  </section>

  <section v-else-if="work" class="stack">
    <article class="panel stack">
      <div class="chips">
        <span class="pill">{{ formatWorkSection(work.sectionCode) }}</span>
        <span class="pill">{{ ratingLabel(work.averageRating, work.ratingsCount) }}</span>
        <span class="pill">комментариев: {{ work.commentsCount }}</span>
        <span v-if="work.projectFormat" class="pill">{{ work.projectFormat }}</span>
      </div>

      <div class="section-head">
        <div>
          <h2>{{ work.title }}</h2>
          <div class="meta">
            {{ work.author?.displayName || work.author?.login }} · {{ formatDate(work.publishedAt || work.createdAt) }}
          </div>
        </div>
        <RouterLink
          v-if="work.author?.login"
          class="btn btn-outline"
          :to="buildAuthorPageLocation(work.author)"
        >
          Страница автора
        </RouterLink>
      </div>

      <div class="prewrap">{{ work.body || work.summary || work.excerpt || 'Текст пока не добавлен.' }}</div>
    </article>

    <section class="panel stack">
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
            <label for="work-page-comment">Новый комментарий</label>
            <textarea
              id="work-page-comment"
              v-model="commentText"
              class="textarea"
              required
              placeholder="Напиши отзыв о тексте"
            />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать комментарий' }}</button>
          <div v-if="commentStatus" class="message" :class="commentStatus.includes('опубликован') ? 'success' : 'error'">{{ commentStatus }}</div>
        </form>
      </div>
      <div v-else class="message">Чтобы ставить оценки и оставлять комментарии, войди или зарегистрируйся в шапке.</div>

      <hr class="divider" />

      <div class="section-head">
        <h3>Комментарии</h3>
        <span class="pill">{{ commentsLoading ? 'обновляем…' : `${comments.length} записей` }}</span>
      </div>
      <div v-if="commentsError" class="message error">{{ commentsError }}</div>
      <div v-if="comments.length" class="stack">
        <article v-for="comment in comments" :key="comment.id" class="comment-item">
          <strong>{{ comment.author?.displayName || comment.author?.login || 'Пользователь' }}</strong>
          <div class="meta">{{ formatDate(comment.createdAt) }}</div>
          <div class="comment-body">{{ comment.body }}</div>
        </article>
      </div>
      <div v-else-if="!commentsLoading" class="empty-state">Пока без комментариев — можно начать обсуждение первым.</div>
    </section>
  </section>
</template>
