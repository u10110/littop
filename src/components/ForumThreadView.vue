<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';


import { apolloClient } from '../lib/apollo.js';
import {
  CREATE_FORUM_POST_MUTATION,
  DELETE_FORUM_POST_MUTATION,
  DELETE_FORUM_TOPIC_MUTATION,
  FORUM_SECTIONS_QUERY,
  UPDATE_FORUM_POST_MUTATION,
  UPDATE_FORUM_TOPIC_MUTATION,
} from '../lib/graphql.js';
import { formatDate } from '../lib/format.js';
import { uploadForumPostImage, uploadForumTopicImage } from '../lib/forumImages.js';
import { flattenForumPostTree, getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation, buildForumTopicPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const props = defineProps({
  topic: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['refresh']);

const { currentUser, isAuthenticated, bootstrapSession } = useSession();

const threadBusy = ref(false);
const threadStatus = ref('');
const rootPostBody = ref('');
const rootPostImageFile = ref(null);
const rootPostTextarea = ref(null);
const replyTargetId = ref(null);
const replyBody = ref('');
const replyImageFile = ref(null);
const editPostId = ref(null);
const editBody = ref('');
const editImageFile = ref(null);

const topicEditImageFile = ref(null);
const topicEditImageUrl = ref('');
const featuredBusy = ref(false);

const topicEditMode = ref(false);
const topicEditBusy = ref(false);
const topicEditStatus = ref('');
const topicEditForm = ref({
  sectionSlug: '',
  title: '',
  body: '',
});

const { result: sectionsResult } = useQuery(FORUM_SECTIONS_QUERY, {}, {
  fetchPolicy: 'cache-first',
});

const sections = computed(() => sectionsResult.value?.forumSections ?? []);
const flatPosts = computed(() => flattenForumPostTree(props.topic?.posts ?? []));
const currentUserId = computed(() => String(currentUser.value?.id || ''));
const isAdmin = computed(() => currentUser.value?.role === 'admin');
const canManageTopic = computed(() => {
  if (!currentUserId.value || !props.topic?.author?.id) {
    return false;
  }
  return currentUserId.value === String(props.topic.author.id) || isAdmin.value;
});

onMounted(() => {
  bootstrapSession();
});

watch(() => props.topic?.id, () => {
  resetComposer();
  syncTopicEditForm();
}, { immediate: true });

watch(sections, () => {
  syncTopicEditForm();
}, { immediate: true });

function resetComposer() {
  rootPostBody.value = '';
  rootPostImageFile.value = null;
  replyTargetId.value = null;
  replyBody.value = '';
  replyImageFile.value = null;
  editPostId.value = null;
  editBody.value = '';
  editImageFile.value = null;
  threadStatus.value = '';
}

function syncTopicEditForm() {
  if (topicEditMode.value) return;
  const fallbackSection = sections.value[0]?.slug || '';
  topicEditForm.value = {
    sectionSlug: props.topic?.sectionSlug || fallbackSection,
    title: props.topic?.title || '',
    body: props.topic?.body || '',
  };
  topicEditImageUrl.value = props.topic?.imageUrl || '';
  topicEditImageFile.value = null;
}

function startTopicEdit() {
  syncTopicEditForm();
  topicEditStatus.value = '';
  topicEditMode.value = true;
}

function cancelTopicEdit() {
  topicEditMode.value = false;
  topicEditStatus.value = '';
  syncTopicEditForm();
}

function focusRootReplyForm() {
  replyTargetId.value = null;
  editPostId.value = null;
  editBody.value = '';
  queueMicrotask(() => {
    rootPostTextarea.value?.focus?.();
    rootPostTextarea.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  });
}

function isOwnPost(post) {
  return Boolean(currentUserId.value) && String(post?.userId || '') === currentUserId.value;
}

function canDeletePost(post) {
  return isOwnPost(post) || isAdmin.value;
}

function startReply(post) {
  replyTargetId.value = post?.id ?? null;
  replyBody.value = '';
  replyImageFile.value = null;
  editPostId.value = null;
  editBody.value = '';
  editImageFile.value = null;
  threadStatus.value = '';
}

function cancelReply() {
  replyTargetId.value = null;
  replyBody.value = '';
  replyImageFile.value = null;
}

function startEdit(post) {
  editPostId.value = post?.id ?? null;
  editBody.value = String(post?.body || '');
  editImageFile.value = null;
  replyTargetId.value = null;
  replyBody.value = '';
  replyImageFile.value = null;
  threadStatus.value = '';
}

function cancelEdit() {
  editPostId.value = null;
  editBody.value = '';
  editImageFile.value = null;
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

function handleRootImageChange(event) {
  rootPostImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleReplyImageChange(event) {
  replyImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleEditImageChange(event) {
  editImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleTopicImageEditChange(event) {
  topicEditImageFile.value = event?.target?.files?.[0] ?? null;
}

async function toggleFeaturedMain() {
  if (!props.topic?.id) return;
  featuredBusy.value = true;
  try {
    await apolloClient.mutate({
      mutation: UPDATE_FORUM_TOPIC_MUTATION,
      variables: {
        topicId: props.topic.id,
        input: {
          sectionSlug: String(props.topic.sectionSlug || '').trim(),
          title: String(props.topic.title || '').trim(),
          body: String(props.topic.body || '').trim(),
          featuredMain: !props.topic.featuredMain,
        },
      },
    });
    emit('refresh');
  } catch (mutationError) {
    topicEditStatus.value = mutationError.message;
  } finally {
    featuredBusy.value = false;
  }
}

async function resolveUploadedImageUrl(file, fallbackUrl = null) {
  if (file instanceof File) {
    return uploadForumPostImage({ file });
  }
  return fallbackUrl;
}

async function submitTopicEdit() {
  if (!props.topic?.id) return;
  topicEditBusy.value = true;
  topicEditStatus.value = '';

  try {
    const imageUrl = topicEditImageFile.value instanceof File
      ? await uploadForumTopicImage({ file: topicEditImageFile.value })
      : (topicEditImageUrl.value || '');
    await apolloClient.mutate({
      mutation: UPDATE_FORUM_TOPIC_MUTATION,
      variables: {
        topicId: props.topic.id,
        input: {
          sectionSlug: String(topicEditForm.value.sectionSlug || '').trim(),
          title: String(topicEditForm.value.title || '').trim(),
          body: String(topicEditForm.value.body || '').trim(),
          imageUrl,
        },
      },
    });
    topicEditMode.value = false;
    topicEditStatus.value = 'Тема обновлена и при необходимости перенесена в другую секцию.';
    emit('refresh');
  } catch (mutationError) {
    topicEditStatus.value = mutationError.message;
  } finally {
    topicEditBusy.value = false;
  }
}

async function submitRootPost() {
  if (!props.topic?.id) return;
  const body = String(rootPostBody.value || '').trim();
  if (!body) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(rootPostImageFile.value);
    await apolloClient.mutate({
      mutation: CREATE_FORUM_POST_MUTATION,
      variables: {
        topicId: props.topic.id,
        body,
        parentPostId: null,
        imageUrl,
      },
    });
    rootPostBody.value = '';
    rootPostImageFile.value = null;
    threadStatus.value = imageUrl ? 'Ответ с изображением опубликован.' : 'Ответ опубликован.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function submitReply(post) {
  if (!props.topic?.id || !post?.id) return;
  const body = String(replyBody.value || '').trim();
  if (!body) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(replyImageFile.value);
    await apolloClient.mutate({
      mutation: CREATE_FORUM_POST_MUTATION,
      variables: {
        topicId: props.topic.id,
        body,
        parentPostId: post.id,
        imageUrl,
      },
    });
    replyBody.value = '';
    replyImageFile.value = null;
    replyTargetId.value = null;
    threadStatus.value = imageUrl ? 'Комментарий с изображением добавлен.' : 'Комментарий к сообщению добавлен.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function submitEdit(post) {
  if (!post?.id) return;
  const body = String(editBody.value || '').trim();
  if (!body) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(editImageFile.value, post.imageUrl || null);
    await apolloClient.mutate({
      mutation: UPDATE_FORUM_POST_MUTATION,
      variables: {
        postId: post.id,
        body,
        imageUrl,
      },
    });
    editPostId.value = null;
    editBody.value = '';
    editImageFile.value = null;
    threadStatus.value = 'Сообщение обновлено.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function deleteTopic() {
  if (!props.topic?.id) return;
  const confirmed = globalThis.confirm?.('Удалить эту тему форума? Все сообщения внутри тоже исчезнут.') ?? true;
  if (!confirmed) return;
  threadBusy.value = true;
  threadStatus.value = '';
  try {
    await apolloClient.mutate({ mutation: DELETE_FORUM_TOPIC_MUTATION, variables: { topicId: props.topic.id } });
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function deletePost(post) {
  if (!post?.id) return;
  const confirmed = globalThis.confirm?.('Удалить это сообщение? Все дочерние ответы тоже исчезнут из ветки.') ?? true;
  if (!confirmed) {
    return;
  }

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_FORUM_POST_MUTATION,
      variables: {
        postId: post.id,
      },
    });
    if (replyTargetId.value === post.id) {
      cancelReply();
    }
    if (editPostId.value === post.id) {
      cancelEdit();
    }
    threadStatus.value = 'Сообщение удалено вместе с дочерними ответами.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}
</script>

<template>
  <article v-if="topic" class="panel stack">
    <div class="section-head topic-thread-header">
      <div class="forum-topic-headline">
        <div class="chips">
          <span class="pill">{{ topic.sectionSlug }}</span>
          <span v-if="topic.isPinned" class="pill warn">закреп</span>
        </div>
        <h2>{{ topic.title }}</h2>
        <div class="meta">
          <RouterLink v-if="topic.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(topic.author)">{{ authorLabel(topic.author) }}</RouterLink>
          <template v-else>{{ authorLabel(topic.author) }}</template>
          · {{ formatDate(topic.createdAt) }}
        </div>
      </div>
      <div v-if="canManageTopic" class="inline-actions">
        <button
          class="btn btn-outline"
          type="button"
          :disabled="topicEditBusy"
          @click="topicEditMode ? cancelTopicEdit() : startTopicEdit()"
        >
          <Icon name="pencil" />{{ topicEditMode ? 'Отменить редактирование темы' : 'Редактировать тему / секцию' }}
        </button>
        <button
          v-if="canManageTopic"
          class="btn btn-danger"
          type="button"
          :disabled="topicEditBusy || threadBusy"
          @click="deleteTopic"
        >
          <Icon name="trash-2" />Удалить тему
        </button>
      </div>
      <div v-if="isAdmin && topic.sectionSlug === 'editor-column'" class="inline-actions">
        <button class="btn btn-primary" type="button" :disabled="featuredBusy" @click="toggleFeaturedMain">
          {{ topic.featuredMain ? 'Убрать с главной' : 'Вывести на главную' }}
        </button>
      </div>
      <div class="inline-actions">
        <RouterLink class="btn btn-outline" :to="buildForumTopicPageLocation(topic)">Открыть тему</RouterLink>
        <button v-if="isAuthenticated" class="btn btn-primary" type="button" :disabled="threadBusy" @click="focusRootReplyForm">
          <Icon name="reply" />Ответить на тему
        </button>
      </div>
    </div>

    <div v-if="topicEditStatus" class="message" :class="topicEditStatus.includes('обновлена') ? 'success' : 'error'">
      {{ topicEditStatus }}
    </div>

    <form v-if="topicEditMode && canManageTopic" class="stack" @submit.prevent="submitTopicEdit">
      <div class="field">
        <label for="topic-edit-section">Секция</label>
        <select id="topic-edit-section" v-model="topicEditForm.sectionSlug" class="select" required>
          <option v-for="section in sections" :key="section.id" :value="section.slug">{{ section.name }}</option>
        </select>
      </div>
      <div class="field">
        <label for="topic-edit-title">Заголовок темы</label>
        <input id="topic-edit-title" v-model="topicEditForm.title" class="input" required />
      </div>
      <div class="field">
        <label for="topic-edit-body">Текст темы</label>
        <textarea id="topic-edit-body" v-model="topicEditForm.body" class="textarea" required />
      </div>
      <div class="field">
        <label>Картинка темы</label>
        <img v-if="topicEditImageUrl && !topicEditImageFile" :src="topicEditImageUrl" class="forum-topic-preview-image" alt="текущая картинка темы" />
        <input type="file" accept="image/*" @change="handleTopicImageEditChange" />
        <button v-if="topicEditImageUrl || topicEditImageFile" class="btn btn-outline btn-sm" type="button" :disabled="topicEditBusy" @click="topicEditImageUrl = ''; topicEditImageFile = null;">Убрать картинку</button>
      </div>
      <div class="inline-actions">
        <button class="btn btn-primary" type="submit" :disabled="topicEditBusy">{{ topicEditBusy ? 'Сохраняем…' : 'Сохранить тему' }}</button>
        <button class="btn btn-outline" type="button" :disabled="topicEditBusy" @click="cancelTopicEdit">Отмена</button>
      </div>
    </form>

    <article class="forum-topic-opening">
      <div class="forum-post-avatar-wrap">
        <img v-if="topic.author?.avatarUrl" :src="topic.author.avatarUrl" class="forum-post-avatar" alt="avatar автора темы" />
        <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(topic.author) }}</div>
      </div>
      <div class="forum-topic-opening-body">
        <div class="forum-post-author-line">
          <RouterLink v-if="topic.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(topic.author)"><strong>{{ authorLabel(topic.author) }}</strong></RouterLink>
          <strong v-else>{{ authorLabel(topic.author) }}</strong>
          <span v-if="topic.author?.city" class="meta">· {{ topic.author.city }}</span>
        </div>
        <div class="prewrap">{{ topic.body || 'Текст темы не указан.' }}</div>
        <img v-if="topic.imageUrl" :src="topic.imageUrl" class="forum-topic-hero-image" alt="картинка темы" />
      </div>
    </article>

    <hr class="divider" />

    <div class="section-head">
      <h3><Icon name="messages-square" />Обсуждение</h3>
      <span class="pill">{{ loading ? 'обновляем…' : `${flatPosts.length} сообщений` }}</span>
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="threadStatus" class="message" :class="threadStatus.includes('обновлено') || threadStatus.includes('опубликован') || threadStatus.includes('добавлен') || threadStatus.includes('удалено') ? 'success' : 'error'">
      {{ threadStatus }}
    </div>

    <div v-if="flatPosts.length" class="stack">
      <article
        v-for="post in flatPosts"
        :key="post.id"
        class="forum-thread-post"
        :style="depthStyle(post.depth)"
      >
        <div class="forum-post-avatar-wrap">
          <img v-if="post.author?.avatarUrl" :src="post.author.avatarUrl" class="forum-post-avatar" alt="avatar автора сообщения" />
          <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(post.author) }}</div>
        </div>

        <div class="forum-thread-post-body">
          <div class="forum-post-author-line">
            <RouterLink v-if="post.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(post.author)"><strong>{{ authorLabel(post.author) }}</strong></RouterLink>
            <strong v-else>{{ authorLabel(post.author) }}</strong>
            <span v-if="post.author?.city" class="meta">· {{ post.author.city }}</span>
            <span class="meta">· {{ formatDate(post.updatedAt || post.createdAt) }}</span>
          </div>
          <div v-if="post.replyToAuthor" class="forum-reply-note">
            Ответ пользователю:
            <RouterLink v-if="post.replyToAuthor?.login" class="user-inline-link" :to="buildAuthorPageLocation(post.replyToAuthor)">{{ authorLabel(post.replyToAuthor) }}</RouterLink>
            <template v-else>{{ authorLabel(post.replyToAuthor) }}</template>
          </div>
          <div class="post-body prewrap">{{ post.body }}</div>
          <img v-if="post.imageUrl" :src="post.imageUrl" class="forum-post-image" alt="изображение сообщения" />

          <div class="inline-actions forum-post-actions">
            <button
              v-if="isAuthenticated"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startReply(post)"
            >
              <Icon name="message-square-plus" />Добавить комментарий
            </button>
            <button
              v-if="isAuthenticated && isOwnPost(post)"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startEdit(post)"
            >
              <Icon name="pencil" />Редактировать
            </button>
            <button
              v-if="isAuthenticated && canDeletePost(post)"
              class="btn btn-danger"
              type="button"
              :disabled="threadBusy"
              @click="deletePost(post)"
            >
              <Icon name="trash-2" />Удалить
            </button>
          </div>

          <form v-if="replyTargetId === post.id" class="stack forum-inline-form" @submit.prevent="submitReply(post)">
            <div class="field">
              <label :for="`reply-post-${post.id}`">Ответить на сообщение</label>
              <textarea :id="`reply-post-${post.id}`" v-model="replyBody" class="textarea" required placeholder="Твой ответ" />
            </div>
            <div class="field">
              <label :for="`reply-image-${post.id}`">Изображение</label>
              <input :id="`reply-image-${post.id}`" class="input" type="file" accept="image/*" @change="handleReplyImageChange" />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="threadBusy"><Icon name="send" />{{ threadBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
              <button class="btn btn-outline" type="button" :disabled="threadBusy" @click="cancelReply">Отмена</button>
            </div>
          </form>

          <form v-if="editPostId === post.id" class="stack forum-inline-form" @submit.prevent="submitEdit(post)">
            <div class="field">
              <label :for="`edit-post-${post.id}`">Редактировать сообщение</label>
              <textarea :id="`edit-post-${post.id}`" v-model="editBody" class="textarea" required />
            </div>
            <div class="field">
              <label :for="`edit-image-${post.id}`">Новое изображение</label>
              <input :id="`edit-image-${post.id}`" class="input" type="file" accept="image/*" @change="handleEditImageChange" />
              <div v-if="post.imageUrl" class="meta">Если файл не выбрать, текущая картинка сохранится.</div>
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="threadBusy"><Icon name="save" />{{ threadBusy ? 'Сохраняем…' : 'Сохранить' }}</button>
              <button class="btn btn-outline" type="button" :disabled="threadBusy" @click="cancelEdit">Отмена</button>
            </div>
          </form>
        </div>
      </article>
    </div>
    <div v-else-if="!loading" class="empty-state">Пока без ответов — можно запустить обсуждение первым.</div>

    <form v-if="isAuthenticated" class="stack" @submit.prevent="submitRootPost">
      <div class="field">
        <label for="forum-root-post">Ответить в тему</label>
        <textarea ref="rootPostTextarea" id="forum-root-post" v-model="rootPostBody" class="textarea" required placeholder="Твой ответ" />
      </div>
      <div class="field">
        <label for="forum-root-image">Изображение</label>
        <input id="forum-root-image" class="input" type="file" accept="image/*" @change="handleRootImageChange" />
      </div>
      <button class="btn btn-primary" type="submit" :disabled="threadBusy"><Icon name="send" />{{ threadBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
    </form>
    <div v-else class="message">Чтобы отвечать в темы, войди или зарегистрируйся в шапке.</div>
  </article>
</template>
