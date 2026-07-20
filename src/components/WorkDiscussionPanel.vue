<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import {
  ADD_WORK_COMMENT_MUTATION,
  AUTHOR_PAGE_VISITORS_QUERY,
  DELETE_WORK_COMMENT_MUTATION,
  RATE_WORK_MUTATION,
  TOGGLE_WORK_COMMENT_LIKE_MUTATION,
  TOGGLE_WORK_DISLIKE_MUTATION,
  TOGGLE_WORK_LIKE_MUTATION,
  UPDATE_WORK_COMMENT_MUTATION,
  WORK_COMMENT_LIKERS_QUERY,
  WORK_COMMENTS_QUERY,
  WORK_LIKERS_QUERY,
  WORK_READERS_QUERY,
} from '../lib/graphql.js';
import { flattenThreadTree } from '../lib/discussion.js';
import { formatDate } from '../lib/format.js';
import { getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation } from '../lib/routes.js';
import { renderRichTextHtml } from '../lib/richText.js';
import { useSession } from '../lib/session.js';

const props = defineProps({
  work: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['refresh']);

const { bootstrapSession, currentUser, isAuthenticated } = useSession();

const comments = ref([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentStatus = ref('');
const commentBusy = ref(false);
const rootCommentBody = ref('');
const replyTargetId = ref(null);
const replyBody = ref('');
const editCommentId = ref(null);
const editBody = ref('');

const ratingBusy = ref(false);
const ratingStatus = ref('');
const workLikeBusy = ref(false);
const workDislikeBusy = ref(false);
const workReactionStatus = ref('');

const workLikersOpen = ref(false);
const workLikersBusy = ref(false);
const workLikers = ref([]);

const readersOpen = ref(false);
const readersBusy = ref(false);
const readersLedger = ref({ totalViews: 0, lockedViews: 0, batchSize: 200, viewers: [] });

const visitorsOpen = ref(false);
const visitorsBusy = ref(false);
const visitorsLedger = ref({ totalViews: 0, lockedViews: 0, batchSize: 200, visitors: [] });

const activeCommentLikersId = ref(null);
const activeCommentLikersBusy = ref(false);
const activeCommentLikers = ref([]);

const currentUserId = computed(() => String(currentUser.value?.id || ''));
const isAdmin = computed(() => currentUser.value?.role === 'admin');
const workAuthorId = computed(() => String(props.work?.author?.id || ''));
const isWorkOwner = computed(() => Boolean(currentUserId.value) && currentUserId.value === workAuthorId.value);
const flatComments = computed(() => flattenThreadTree(comments.value, { parentKey: 'parentCommentId' }));

onMounted(() => {
  bootstrapSession();
});

watch(() => props.work?.id, () => {
  resetCommentForms();
  resetPanels();
  loadComments();
}, { immediate: true });

function resetCommentForms() {
  commentsError.value = '';
  commentStatus.value = '';
  rootCommentBody.value = '';
  replyTargetId.value = null;
  replyBody.value = '';
  editCommentId.value = null;
  editBody.value = '';
}

function resetPanels() {
  ratingStatus.value = '';
  workReactionStatus.value = '';
  workLikersOpen.value = false;
  workLikers.value = [];
  readersOpen.value = false;
  readersLedger.value = { totalViews: 0, lockedViews: 0, batchSize: 200, viewers: [] };
  visitorsOpen.value = false;
  visitorsLedger.value = { totalViews: 0, lockedViews: 0, batchSize: 200, visitors: [] };
  activeCommentLikersId.value = null;
  activeCommentLikers.value = [];
}

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function authorInitial(author) {
  return getAuthorInitial(author);
}

function depthStyle(depth) {
  return {
    '--forum-depth': Math.min(Math.max(Number(depth) || 0, 0), 6),
  };
}

function canEditComment(comment) {
  return Boolean(currentUserId.value) && String(comment?.userId || '') === currentUserId.value;
}

function canDeleteComment(comment) {
  if (!currentUserId.value) return false;
  const commentAuthorId = String(comment?.userId || '');
  return commentAuthorId === currentUserId.value || isWorkOwner.value || isAdmin.value;
}

function startReply(comment) {
  replyTargetId.value = comment?.id ?? null;
  replyBody.value = '';
  editCommentId.value = null;
  editBody.value = '';
  commentStatus.value = '';
}

function cancelReply() {
  replyTargetId.value = null;
  replyBody.value = '';
}

function startEdit(comment) {
  editCommentId.value = comment?.id ?? null;
  editBody.value = String(comment?.body || '');
  replyTargetId.value = null;
  replyBody.value = '';
  commentStatus.value = '';
}

function cancelEdit() {
  editCommentId.value = null;
  editBody.value = '';
}

async function emitRefresh() {
  emit('refresh');
}

async function loadComments() {
  if (!props.work?.id) {
    comments.value = [];
    return;
  }

  commentsLoading.value = true;
  commentsError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: WORK_COMMENTS_QUERY,
      variables: {
        workId: props.work.id,
        limit: 200,
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

async function submitRating(rating) {
  if (!props.work?.id) return;
  ratingBusy.value = true;
  ratingStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: RATE_WORK_MUTATION,
      variables: {
        workId: props.work.id,
        rating,
      },
    });
    ratingStatus.value = `Оценка ${rating}/5 сохранена.`;
    await emitRefresh();
  } catch (mutationError) {
    ratingStatus.value = mutationError.message;
  } finally {
    ratingBusy.value = false;
  }
}

async function toggleWorkLike() {
  if (!props.work?.id) return;
  workLikeBusy.value = true;
  workReactionStatus.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: TOGGLE_WORK_LIKE_MUTATION,
      variables: {
        workId: props.work.id,
      },
    });
    workReactionStatus.value = data?.toggleWorkLike?.likedByMe ? 'Лайк поставлен.' : 'Лайк убран.';
    if (workLikersOpen.value) {
      await loadWorkLikers();
    }
    await emitRefresh();
  } catch (mutationError) {
    workReactionStatus.value = mutationError.message;
  } finally {
    workLikeBusy.value = false;
  }
}

async function toggleWorkDislike() {
  if (!props.work?.id) return;
  workDislikeBusy.value = true;
  workReactionStatus.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: TOGGLE_WORK_DISLIKE_MUTATION,
      variables: {
        workId: props.work.id,
      },
    });
    workReactionStatus.value = data?.toggleWorkDislike?.dislikedByMe ? 'Дизлайк поставлен.' : 'Дизлайк убран.';
    await emitRefresh();
  } catch (mutationError) {
    workReactionStatus.value = mutationError.message;
  } finally {
    workDislikeBusy.value = false;
  }
}

async function submitRootComment() {
  if (!props.work?.id) return;
  const body = String(rootCommentBody.value || '').trim();
  if (!body) return;

  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: props.work.id,
        body,
        parentCommentId: null,
      },
    });
    rootCommentBody.value = '';
    commentStatus.value = 'Отзыв опубликован.';
    await Promise.all([loadComments(), emitRefresh()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function submitReply(comment) {
  if (!props.work?.id || !comment?.id) return;
  const body = String(replyBody.value || '').trim();
  if (!body) return;

  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: props.work.id,
        body,
        parentCommentId: comment.id,
      },
    });
    replyBody.value = '';
    replyTargetId.value = null;
    commentStatus.value = 'Ответ опубликован.';
    await Promise.all([loadComments(), emitRefresh()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function submitEdit(comment) {
  if (!comment?.id) return;
  const body = String(editBody.value || '').trim();
  if (!body) return;

  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: UPDATE_WORK_COMMENT_MUTATION,
      variables: {
        commentId: comment.id,
        body,
      },
    });
    editCommentId.value = null;
    editBody.value = '';
    commentStatus.value = 'Отзыв обновлён.';
    await Promise.all([loadComments(), emitRefresh()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function deleteComment(comment) {
  if (!comment?.id) return;
  const confirmed = globalThis.confirm?.('Удалить этот отзыв? Если у него есть дочерние ответы, они тоже исчезнут из обсуждения.') ?? true;
  if (!confirmed) {
    return;
  }

  commentBusy.value = true;
  commentStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_WORK_COMMENT_MUTATION,
      variables: {
        commentId: comment.id,
      },
    });
    if (replyTargetId.value === comment.id) {
      cancelReply();
    }
    if (editCommentId.value === comment.id) {
      cancelEdit();
    }
    if (activeCommentLikersId.value === comment.id) {
      activeCommentLikersId.value = null;
      activeCommentLikers.value = [];
    }
    commentStatus.value = 'Отзыв удалён вместе с дочерними ответами.';
    await Promise.all([loadComments(), emitRefresh()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function toggleCommentLike(comment) {
  if (!comment?.id) return;
  commentBusy.value = true;
  commentStatus.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: TOGGLE_WORK_COMMENT_LIKE_MUTATION,
      variables: {
        commentId: comment.id,
      },
    });
    const updatedComment = data?.toggleWorkCommentLike;
    commentStatus.value = updatedComment?.likedByMe ? 'Лайк на отзыве поставлен.' : 'Лайк на отзыве убран.';
    if (activeCommentLikersId.value === comment.id) {
      await loadCommentLikers(comment.id);
    }
    await Promise.all([loadComments(), emitRefresh()]);
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function loadWorkLikers() {
  if (!props.work?.id) return;
  workLikersBusy.value = true;
  try {
    const { data } = await apolloClient.query({
      query: WORK_LIKERS_QUERY,
      variables: {
        workId: props.work.id,
        limit: 100,
      },
      fetchPolicy: 'network-only',
    });
    workLikers.value = data?.workLikers ?? [];
  } finally {
    workLikersBusy.value = false;
  }
}

async function toggleWorkLikers() {
  workLikersOpen.value = !workLikersOpen.value;
  if (workLikersOpen.value) {
    await loadWorkLikers();
  }
}

async function loadReaders() {
  if (!props.work?.id) return;
  readersBusy.value = true;
  try {
    const { data } = await apolloClient.query({
      query: WORK_READERS_QUERY,
      variables: {
        workId: props.work.id,
        limit: 100,
      },
      fetchPolicy: 'network-only',
    });
    readersLedger.value = data?.workReaders ?? { totalViews: 0, lockedViews: 0, batchSize: 200, viewers: [] };
  } finally {
    readersBusy.value = false;
  }
}

async function toggleReaders() {
  readersOpen.value = !readersOpen.value;
  if (readersOpen.value) {
    await loadReaders();
  }
}

async function loadVisitors() {
  if (!props.work?.id) return;
  visitorsBusy.value = true;
  try {
    const { data } = await apolloClient.query({
      query: AUTHOR_PAGE_VISITORS_QUERY,
      variables: {
        workId: props.work.id,
        limit: 100,
      },
      fetchPolicy: 'network-only',
    });
    visitorsLedger.value = data?.authorPageVisitors ?? { totalViews: 0, lockedViews: 0, batchSize: 200, visitors: [] };
  } finally {
    visitorsBusy.value = false;
  }
}

async function toggleVisitors() {
  visitorsOpen.value = !visitorsOpen.value;
  if (visitorsOpen.value) {
    await loadVisitors();
  }
}

async function loadCommentLikers(commentId) {
  activeCommentLikersBusy.value = true;
  try {
    const { data } = await apolloClient.query({
      query: WORK_COMMENT_LIKERS_QUERY,
      variables: {
        commentId,
        limit: 100,
      },
      fetchPolicy: 'network-only',
    });
    activeCommentLikers.value = data?.workCommentLikers ?? [];
  } finally {
    activeCommentLikersBusy.value = false;
  }
}

async function toggleCommentLikers(comment) {
  if (!comment?.id) return;
  if (activeCommentLikersId.value === comment.id) {
    activeCommentLikersId.value = null;
    activeCommentLikers.value = [];
    return;
  }

  activeCommentLikersId.value = comment.id;
  await loadCommentLikers(comment.id);
}

function ledgerSummary(ledger, noun) {
  if (!ledger?.lockedViews) {
    return `Список ${noun} откроется после первых ${ledger?.batchSize || 200} просмотров.`;
  }
  return `Открыто ${ledger.lockedViews} из ${ledger.totalViews} просмотров. Новый блок появляется каждые ${ledger.batchSize} просмотров.`;
}
</script>

<template>
  <section class="panel stack">
    <div class="section-head">
    <h3>Отзывы и реакции</h3>
    <div class="chips">
      <span class="pill">отзывов: {{ work.commentsCount }}</span>
      <span class="pill">лайков: {{ work.likesCount }}</span>
      <span class="pill">дизлайков: {{ work.dislikesCount }}</span>
    </div>
    </div>

    <div class="stack">
      <div class="field">
        <span class="label">Оценить произведение</span>
        <div class="rate-row">
          <button
            v-for="rating in [1, 2, 3, 4, 5]"
            :key="rating"
            class="btn btn-outline"
            type="button"
            :disabled="!isAuthenticated || ratingBusy"
            @click="submitRating(rating)"
          >
            {{ rating }}★
          </button>
        </div>
        <div v-if="!isAuthenticated" class="note">Чтобы ставить оценки, лайки и отзывы, войди в аккаунт.</div>
        <div v-if="ratingStatus" class="message" :class="ratingStatus.includes('сохранена') ? 'success' : 'error'">{{ ratingStatus }}</div>
      </div>

      <div class="field">
        <span class="label">Лайки и дизлайки произведения</span>
        <div class="inline-actions work-reaction-row">
          <button
            v-if="isAuthenticated"
            class="btn work-reaction-button"
            :class="work.likedByMe ? 'work-reaction-button-active' : 'btn-outline'"
            type="button"
            :disabled="workLikeBusy || workDislikeBusy"
            @click="toggleWorkLike"
          >
            <span class="reaction-sprite reaction-sprite-like" aria-hidden="true" />
            <span>{{ work.likesCount }}</span>
          </button>
          <button
            v-if="isAuthenticated"
            class="btn work-reaction-button"
            :class="work.dislikedByMe ? 'work-reaction-button-active work-reaction-button-dislike' : 'btn-outline work-reaction-button-dislike'"
            type="button"
            :disabled="workLikeBusy || workDislikeBusy"
            @click="toggleWorkDislike"
          >
            <span class="reaction-sprite reaction-sprite-dislike" aria-hidden="true" />
            <span>{{ work.dislikesCount }}</span>
          </button>
          <button class="btn btn-outline" type="button" :disabled="workLikersBusy" @click="toggleWorkLikers">
            {{ workLikersOpen ? 'Скрыть список лайкнувших' : 'Кто лайкнул' }}
          </button>
          <button class="btn btn-outline" type="button" :disabled="readersBusy" @click="toggleReaders">
            {{ readersOpen ? 'Скрыть читателей' : 'Списки читателей' }}
          </button>
          <button class="btn btn-outline" type="button" :disabled="visitorsBusy" @click="toggleVisitors">
            {{ visitorsOpen ? 'Скрыть посетителей' : 'Списки посетителей страницы' }}
          </button>
        </div>
        <div v-if="workReactionStatus" class="message" :class="workReactionStatus.includes('поставлен') || workReactionStatus.includes('убран') ? 'success' : 'error'">{{ workReactionStatus }}</div>
      </div>

      <div v-if="workLikersOpen" class="panel stack roster-panel">
        <div class="section-head">
          <h4>Кто лайкнул произведение</h4>
          <span class="pill">{{ workLikersBusy ? 'загрузка…' : `${workLikers.length} человек` }}</span>
        </div>
        <div v-if="workLikers.length" class="list-grid">
          <article v-for="liker in workLikers" :key="liker.id" class="inline-card compact-stack">
            <RouterLink v-if="liker.login" :to="buildAuthorPageLocation(liker)"><strong>{{ authorLabel(liker) }}</strong></RouterLink>
            <strong v-else>{{ authorLabel(liker) }}</strong>
            <div class="meta">{{ liker.city || 'Без города' }}</div>
            <RouterLink v-if="liker.login" class="btn btn-outline btn-sm" :to="buildAuthorPageLocation(liker)">Страница автора</RouterLink>
          </article>
        </div>
        <div v-else-if="!workLikersBusy" class="empty-state">Пока лайков нет.</div>
      </div>

      <div v-if="readersOpen" class="panel stack roster-panel">
        <div class="section-head">
          <h4>Списки читателей произведения</h4>
          <span class="pill">{{ readersBusy ? 'загрузка…' : `${readersLedger.viewers.length} записей` }}</span>
        </div>
        <div class="note">{{ ledgerSummary(readersLedger, 'читателей') }}</div>
        <div v-if="readersLedger.viewers.length" class="list-grid">
          <article v-for="viewer in readersLedger.viewers" :key="viewer.id" class="inline-card compact-stack">
            <RouterLink v-if="viewer.viewer?.login" :to="buildAuthorPageLocation(viewer.viewer)"><strong>{{ authorLabel(viewer.viewer) }}</strong></RouterLink>
            <strong v-else>{{ authorLabel(viewer.viewer) }}</strong>
            <div class="meta">{{ formatDate(viewer.viewedAt) }}</div>
            <RouterLink v-if="viewer.viewer?.login" class="btn btn-outline btn-sm" :to="buildAuthorPageLocation(viewer.viewer)">Страница автора</RouterLink>
          </article>
        </div>
        <div v-else-if="!readersBusy" class="empty-state">Пока нет открытого блока читателей.</div>
      </div>

      <div v-if="visitorsOpen" class="panel stack roster-panel">
        <div class="section-head">
          <h4>Общие посетители страницы автора</h4>
          <span class="pill">{{ visitorsBusy ? 'загрузка…' : `${visitorsLedger.visitors.length} записей` }}</span>
        </div>
        <div class="note">{{ ledgerSummary(visitorsLedger, 'посетителей') }}</div>
        <div v-if="visitorsLedger.visitors.length" class="list-grid">
          <article v-for="visitor in visitorsLedger.visitors" :key="visitor.id" class="inline-card compact-stack">
            <RouterLink v-if="visitor.viewer?.login" :to="buildAuthorPageLocation(visitor.viewer)"><strong>{{ authorLabel(visitor.viewer) }}</strong></RouterLink>
            <strong v-else>{{ authorLabel(visitor.viewer) }}</strong>
            <div class="meta">{{ visitor.workTitle || 'Другая публикация автора' }}</div>
            <div class="meta">{{ formatDate(visitor.viewedAt) }}</div>
            <RouterLink v-if="visitor.viewer?.login" class="btn btn-outline btn-sm" :to="buildAuthorPageLocation(visitor.viewer)">Страница автора</RouterLink>
          </article>
        </div>
        <div v-else-if="!visitorsBusy" class="empty-state">Пока нет открытого блока посетителей.</div>
      </div>
    </div>

    <div v-if="isAuthenticated" class="stack">
      <form class="stack" @submit.prevent="submitRootComment">
        <div class="field">
          <label for="root-work-review">Новый отзыв</label>
          <textarea
            id="root-work-review"
            v-model="rootCommentBody"
            class="textarea"
            required
            placeholder="Напиши отзыв о произведении"
          />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать отзыв' }}</button>
      </form>
    </div>
    <div v-else class="message">Чтобы оставлять отзывы и ставить лайки, войди или зарегистрируйся в шапке.</div>

    <div v-if="commentStatus" class="message" :class="commentStatus.includes('опубликован') || commentStatus.includes('обновлён') || commentStatus.includes('удалён') || commentStatus.includes('Лайк') ? 'success' : 'error'">
      {{ commentStatus }}
    </div>
    <div v-if="commentsError" class="message error">{{ commentsError }}</div>

    <hr class="divider" />

    <div class="section-head">
      <h3>Отзывы</h3>
      <span class="pill">{{ commentsLoading ? 'обновляем…' : `${flatComments.length} записей` }}</span>
    </div>

    <div v-if="flatComments.length" class="stack">
      <article
        v-for="comment in flatComments"
        :key="comment.id"
        class="comment-item-rich comment-thread-post"
        :style="depthStyle(comment.depth)"
      >
        <div class="forum-post-avatar-wrap">
          <img v-if="comment.author?.avatarUrl" :src="comment.author.avatarUrl" class="forum-post-avatar" alt="avatar автора отзыва" />
          <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(comment.author) }}</div>
        </div>

        <div class="comment-item-body">
          <div class="forum-post-author-line">
            <RouterLink v-if="comment.author?.login" :to="buildAuthorPageLocation(comment.author)"><strong>{{ authorLabel(comment.author) }}</strong></RouterLink>
            <strong v-else>{{ authorLabel(comment.author) }}</strong>
            <span v-if="comment.author?.city" class="meta">· {{ comment.author.city }}</span>
            <span class="meta">· {{ formatDate(comment.updatedAt || comment.createdAt) }}</span>
            <RouterLink v-if="comment.author?.login" class="meta" :to="buildAuthorPageLocation(comment.author)">страница автора</RouterLink>
          </div>
          <div v-if="comment.replyToAuthor" class="forum-reply-note">
            Ответ пользователю:
            <RouterLink v-if="comment.replyToAuthor?.login" :to="buildAuthorPageLocation(comment.replyToAuthor)">{{ authorLabel(comment.replyToAuthor) }}</RouterLink>
            <template v-else>{{ authorLabel(comment.replyToAuthor) }}</template>
          </div>
          <div class="comment-body prewrap rich-text-rendered" v-html="renderRichTextHtml(comment.body)" />

          <div class="inline-actions forum-post-actions">
            <button
              v-if="isAuthenticated"
              class="btn btn-outline btn-sm"
              type="button"
              :disabled="commentBusy"
              @click="startReply(comment)"
            >
              Ответить
            </button>
            <button
              v-if="canEditComment(comment)"
              class="btn btn-outline btn-sm"
              type="button"
              :disabled="commentBusy"
              @click="startEdit(comment)"
            >
              Редактировать
            </button>
            <button
              v-if="canDeleteComment(comment)"
              class="btn btn-danger btn-sm"
              type="button"
              :disabled="commentBusy"
              @click="deleteComment(comment)"
            >
              Удалить
            </button>
            <button
              v-if="isAuthenticated"
              class="btn btn-outline btn-sm"
              type="button"
              :disabled="commentBusy"
              @click="toggleCommentLike(comment)"
            >
              {{ comment.likedByMe ? `Убрать лайк · ${comment.likesCount}` : `Лайк · ${comment.likesCount}` }}
            </button>
            <button
              class="btn btn-outline btn-sm"
              type="button"
              :disabled="activeCommentLikersBusy"
              @click="toggleCommentLikers(comment)"
            >
              {{ activeCommentLikersId === comment.id ? 'Скрыть лайкнувших' : 'Кто лайкнул' }}
            </button>
          </div>

          <div v-if="activeCommentLikersId === comment.id" class="stack roster-inline">
            <div v-if="activeCommentLikersBusy" class="note">Загружаем список лайкнувших…</div>
            <div v-else-if="activeCommentLikers.length" class="chips">
              <RouterLink
                v-for="liker in activeCommentLikers"
                :key="liker.id"
                class="pill"
                :to="buildAuthorPageLocation(liker)"
              >
                {{ authorLabel(liker) }}
              </RouterLink>
            </div>
            <div v-else class="note">Пока никто не лайкнул этот отзыв.</div>
          </div>

          <form v-if="replyTargetId === comment.id" class="stack forum-inline-form" @submit.prevent="submitReply(comment)">
            <div class="field">
              <label :for="`reply-work-comment-${comment.id}`">Ответить на отзыв</label>
              <textarea :id="`reply-work-comment-${comment.id}`" v-model="replyBody" class="textarea" required placeholder="Твой ответ" />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
              <button class="btn btn-outline" type="button" :disabled="commentBusy" @click="cancelReply">Отмена</button>
            </div>
          </form>

          <form v-if="editCommentId === comment.id" class="stack forum-inline-form" @submit.prevent="submitEdit(comment)">
            <div class="field">
              <label :for="`edit-work-comment-${comment.id}`">Редактировать отзыв</label>
              <textarea :id="`edit-work-comment-${comment.id}`" v-model="editBody" class="textarea" required />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="commentBusy">{{ commentBusy ? 'Сохраняем…' : 'Сохранить' }}</button>
              <button class="btn btn-outline" type="button" :disabled="commentBusy" @click="cancelEdit">Отмена</button>
            </div>
          </form>
        </div>
      </article>
    </div>
    <div v-else-if="!commentsLoading" class="empty-state">Пока без отзывов — можно начать обсуждение первым.</div>
  </section>
</template>
