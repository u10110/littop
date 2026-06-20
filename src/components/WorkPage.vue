<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import {
  ADD_WORK_COMMENT_MUTATION,
  DELETE_WORK_MUTATION,
  RATE_WORK_MUTATION,
  UPDATE_WORK_MUTATION,
  WORK_COMMENTS_QUERY,
  WORK_QUERY,
  WORK_VIEWERS_QUERY,
} from '../lib/graphql.js';
import { formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { flattenThreadTree } from '../lib/discussion.js';
import { uploadForumPostImage } from '../lib/forumImages.js';
import { getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const {
  bootstrapSession,
  currentUser,
  isAuthenticated,
} = useSession();

const work = ref(null);
const workLoading = ref(false);
const workError = ref('');
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
const editMode = ref(false);
const editBusy = ref(false);
const editStatus = ref('');
const deleteBusy = ref(false);
const deleteStatus = ref('');
const editForm = ref({
  sectionCode: 'poetry',
  title: '',
  summary: '',
  body: '',
  projectFormat: '',
});
let workRequestVersion = 0;

const projectFormats = [
  { value: '', label: 'Без уточнения' },
  { value: 'song', label: 'Песня' },
  { value: 'presentation', label: 'Презентация' },
  { value: 'stage_production', label: 'Постановка' },
  { value: 'screenplay', label: 'Киносценарий' },
  { value: 'other', label: 'Другое' },
];

const slugOrId = computed(() => normalizeRouteParam(route.params.slugOrId));
const notFound = computed(() => !workLoading.value && !workError.value && Boolean(slugOrId.value) && !work.value);
const isOwner = computed(() => {
  if (!currentUser.value?.id || !work.value?.author?.id) {
    return false;
  }
  return String(currentUser.value.id) === String(work.value.author.id);
});
const flatComments = computed(() => flattenThreadTree(comments.value, 'parentCommentId'));

onMounted(() => {
  bootstrapSession();
});

watch(slugOrId, (value) => {
  loadWorkPage(value);
}, { immediate: true });

watch(work, (value) => {
  if (value && !editMode.value) {
    syncEditForm(value);
  }
}, { immediate: true });

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

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function authorInitial(author) {
  return getAuthorInitial(author);
}

function syncEditForm(sourceWork = work.value) {
  editForm.value = {
    sectionCode: sourceWork?.sectionCode || 'poetry',
    title: sourceWork?.title || '',
    summary: sourceWork?.summary || sourceWork?.excerpt || '',
    body: sourceWork?.body || '',
    projectFormat: sourceWork?.projectFormat || '',
  };
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

function startEditing() {
  syncEditForm();
  editStatus.value = '';
  deleteStatus.value = '';
  editMode.value = true;
}

function cancelEditing() {
  syncEditForm();
  editStatus.value = '';
  editMode.value = false;
}

async function loadWorkPage(value) {
  const requestVersion = workRequestVersion + 1;
  workRequestVersion = requestVersion;
  work.value = null;
  comments.value = [];
  viewers.value = [];
  viewersError.value = '';
  commentsError.value = '';
  workError.value = '';
  commentStatus.value = '';
  commentText.value = '';
  commentImageFile.value = null;
  replyTargetId.value = null;
  replyText.value = '';
  replyImageFile.value = null;
  ratingStatus.value = '';
  editStatus.value = '';
  deleteStatus.value = '';
  editMode.value = false;

  if (!value) {
    return;
  }

  const loaded = await fetchWork(value, requestVersion);
  if (loaded?.id) {
    await loadComments(loaded.id, requestVersion);
  }
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
  if (viewersVisible.value && work.value?.id) {
    await loadViewers(work.value.id);
  }
}

async function refreshCurrentWork() {
  if (!slugOrId.value) {
    return;
  }
  const loaded = await fetchWork(slugOrId.value);
  if (loaded?.id) {
    await loadComments(loaded.id);
    if (viewersVisible.value) {
      await loadViewers(loaded.id);
    }
  }
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
    const imageUrl = await resolveUploadedImageUrl(commentImageFile.value);
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: work.value.id,
        body: commentText.value.trim(),
        parentCommentId: null,
        imageUrl,
      },
    });
    commentText.value = '';
    commentImageFile.value = null;
    commentStatus.value = imageUrl ? 'Комментарий с картинкой опубликован.' : 'Комментарий опубликован.';
    await refreshCurrentWork();
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function submitReply(comment) {
  if (!work.value || !comment?.id) return;
  commentBusy.value = true;
  commentStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(replyImageFile.value);
    await apolloClient.mutate({
      mutation: ADD_WORK_COMMENT_MUTATION,
      variables: {
        workId: work.value.id,
        body: replyText.value.trim(),
        parentCommentId: comment.id,
        imageUrl,
      },
    });
    replyTargetId.value = null;
    replyText.value = '';
    replyImageFile.value = null;
    commentStatus.value = imageUrl ? 'Ответ с картинкой опубликован.' : 'Ответ опубликован.';
    await refreshCurrentWork();
  } catch (mutationError) {
    commentStatus.value = mutationError.message;
  } finally {
    commentBusy.value = false;
  }
}

async function submitWorkUpdate() {
  if (!work.value) return;
  editBusy.value = true;
  editStatus.value = '';
  deleteStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: UPDATE_WORK_MUTATION,
      variables: {
        workId: work.value.id,
        input: {
          sectionCode: editForm.value.sectionCode,
          title: editForm.value.title.trim(),
          summary: normalizeOptional(editForm.value.summary),
          body: normalizeOptional(editForm.value.body),
          excerpt: buildExcerpt(editForm.value.summary, editForm.value.body),
          projectFormat: editForm.value.sectionCode === 'project' ? normalizeOptional(editForm.value.projectFormat) : null,
        },
      },
    });
    editMode.value = false;
    editStatus.value = 'Изменения сохранены.';
    await refreshCurrentWork();
  } catch (mutationError) {
    editStatus.value = mutationError.message;
  } finally {
    editBusy.value = false;
  }
}

async function softDeleteCurrentWork() {
  if (!work.value) return;
  const confirmed = globalThis.confirm?.('Убрать произведение в архив? Удаление будет мягким — через статус archived.') ?? true;
  if (!confirmed) {
    return;
  }

  deleteBusy.value = true;
  deleteStatus.value = '';
  editStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_WORK_MUTATION,
      variables: {
        workId: work.value.id,
      },
    });
    deleteStatus.value = 'Произведение убрано в архив.';
    editMode.value = false;
    await refreshCurrentWork();
  } catch (mutationError) {
    deleteStatus.value = mutationError.message;
  } finally {
    deleteBusy.value = false;
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
        <span v-if="work.status && work.status !== 'published'" class="pill warn">{{ work.status }}</span>
      </div>

      <div class="section-head work-page-head-row">
        <div>
          <h2>{{ work.title }}</h2>
          <div class="meta">
            <RouterLink v-if="work.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(work.author)">{{ authorLabel(work.author) }}</RouterLink>
            <template v-else>{{ authorLabel(work.author) }}</template>
            · {{ formatDate(work.publishedAt || work.createdAt) }}
          </div>
        </div>
        <div class="inline-actions">
          <button class="btn btn-outline" type="button" @click="toggleViewers">
            {{ viewersVisible ? 'Скрыть список просмотров' : 'Список просмотров' }}
          </button>
          <button
            v-if="isOwner"
            class="btn btn-outline"
            type="button"
            :disabled="editBusy || deleteBusy"
            @click="editMode ? cancelEditing() : startEditing()"
          >
            {{ editMode ? 'Отменить редактирование' : 'Редактировать' }}
          </button>
          <button
            v-if="isOwner"
            class="btn btn-danger"
            type="button"
            :disabled="editBusy || deleteBusy"
            @click="softDeleteCurrentWork"
          >
            {{ deleteBusy ? 'Архивируем…' : 'Удалить' }}
          </button>
        </div>
      </div>

      <div v-if="editStatus" class="message" :class="editStatus.includes('сохранены') ? 'success' : 'error'">{{ editStatus }}</div>
      <div v-if="deleteStatus" class="message" :class="deleteStatus.includes('архив') ? 'success' : 'error'">{{ deleteStatus }}</div>

      <form v-if="editMode && isOwner" class="stack work-edit-form" @submit.prevent="submitWorkUpdate">
        <div class="field">
          <label for="edit-work-section">Раздел</label>
          <select id="edit-work-section" v-model="editForm.sectionCode" class="select">
            <option value="poetry">Поэзия</option>
            <option value="prose">Проза</option>
            <option value="project">Творческий проект</option>
          </select>
        </div>

        <div v-if="editForm.sectionCode === 'project'" class="field">
          <label for="edit-work-project-format">Формат проекта</label>
          <select id="edit-work-project-format" v-model="editForm.projectFormat" class="select">
            <option v-for="option in projectFormats" :key="option.value || 'default'" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="field">
          <label for="edit-work-title">Заголовок</label>
          <input id="edit-work-title" v-model="editForm.title" class="input" required />
        </div>

        <div class="field">
          <label for="edit-work-summary">Краткое описание</label>
          <textarea id="edit-work-summary" v-model="editForm.summary" class="textarea" placeholder="2–3 предложения о публикации" />
        </div>

        <div class="field">
          <label for="edit-work-body">Текст</label>
          <textarea id="edit-work-body" v-model="editForm.body" class="textarea" placeholder="Полный текст произведения" />
        </div>

        <div class="inline-actions">
          <button class="btn btn-primary" type="submit" :disabled="editBusy">{{ editBusy ? 'Сохраняем…' : 'Сохранить' }}</button>
          <button class="btn btn-outline" type="button" :disabled="editBusy" @click="cancelEditing">Отмена</button>
        </div>
      </form>

      <div v-else class="prewrap">{{ work.body || work.summary || work.excerpt || 'Текст пока не добавлен.' }}</div>
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
          <div class="field">
            <label for="work-page-comment-image">Картинка к комментарию</label>
            <input id="work-page-comment-image" class="input" type="file" accept="image/*" @change="handleCommentImageChange" />
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
              <span v-if="comment.author?.city" class="meta">· {{ comment.author.city }}</span>
              <span class="meta">· {{ formatDate(comment.updatedAt || comment.createdAt) }}</span>
            </div>
            <div v-if="comment.replyToAuthor" class="forum-reply-note">
              Ответ пользователю {{ authorLabel(comment.replyToAuthor) }}
            </div>
            <div class="comment-body prewrap">{{ comment.body }}</div>
            <img v-if="comment.imageUrl" :src="comment.imageUrl" class="forum-post-image" alt="Картинка к комментарию" />
            <div v-if="isAuthenticated" class="inline-actions forum-post-actions">
              <button class="btn btn-outline" type="button" :disabled="commentBusy" @click="startReply(comment)">Ответить</button>
            </div>
            <form v-if="replyTargetId === comment.id" class="stack forum-inline-form" @submit.prevent="submitReply(comment)">
              <div class="field">
                <label :for="`reply-comment-${comment.id}`">Ответить на комментарий</label>
                <textarea :id="`reply-comment-${comment.id}`" v-model="replyText" class="textarea" required placeholder="Твой ответ" />
              </div>
              <div class="field">
                <label :for="`reply-comment-image-${comment.id}`">Картинка к ответу</label>
                <input :id="`reply-comment-image-${comment.id}`" class="input" type="file" accept="image/*" @change="handleReplyImageChange" />
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
    </section>
  </section>
</template>
