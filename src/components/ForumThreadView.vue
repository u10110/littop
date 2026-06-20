<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import {
  CREATE_FORUM_POST_MUTATION,
  DELETE_FORUM_POST_MUTATION,
  DELETE_FORUM_TOPIC_MUTATION,
  UPDATE_FORUM_POST_MUTATION,
  UPDATE_FORUM_TOPIC_MUTATION,
} from '../lib/graphql.js';
import { formatDate } from '../lib/format.js';
import { uploadForumPostImage } from '../lib/forumImages.js';
import { flattenForumPostTree, getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation } from '../lib/routes.js';
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
const topicEditMode = ref(false);
const topicForm = ref({
  title: '',
  body: '',
});
const rootPostBody = ref('');
const rootImageFile = ref(null);
const replyTargetId = ref(null);
const replyBody = ref('');
const replyImageFile = ref(null);
const editPostId = ref(null);
const editBody = ref('');
const editImageFile = ref(null);

const flatPosts = computed(() => flattenForumPostTree(props.topic?.posts ?? []));
const currentUserId = computed(() => String(currentUser.value?.id || ''));
const isAdmin = computed(() => currentUser.value?.role === 'admin');

onMounted(() => {
  bootstrapSession();
});

watch(() => props.topic?.id, () => {
  resetComposer();
}, { immediate: true });

function resetComposer() {
  topicEditMode.value = false;
  topicForm.value = {
    title: String(props.topic?.title || ''),
    body: String(props.topic?.body || ''),
  };
  rootPostBody.value = '';
  rootImageFile.value = null;
  replyTargetId.value = null;
  replyBody.value = '';
  replyImageFile.value = null;
  editPostId.value = null;
  editBody.value = '';
  editImageFile.value = null;
  threadStatus.value = '';
}

function isOwnPost(post) {
  return Boolean(currentUserId.value) && String(post?.userId || '') === currentUserId.value;
}

function canManagePost(post) {
  return isAdmin.value || isOwnPost(post);
}

function canManageTopic() {
  return isAdmin.value || (Boolean(currentUserId.value) && String(props.topic?.author?.id || '') === currentUserId.value);
}

function authorLocation(author) {
  return author?.login ? buildAuthorPageLocation(author) : null;
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
  rootImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleReplyImageChange(event) {
  replyImageFile.value = event?.target?.files?.[0] ?? null;
}

function handleEditImageChange(event) {
  editImageFile.value = event?.target?.files?.[0] ?? null;
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

function startTopicEdit() {
  topicEditMode.value = true;
  topicForm.value = {
    title: String(props.topic?.title || ''),
    body: String(props.topic?.body || ''),
  };
  threadStatus.value = '';
}

function cancelTopicEdit() {
  topicEditMode.value = false;
  topicForm.value = {
    title: String(props.topic?.title || ''),
    body: String(props.topic?.body || ''),
  };
}

async function resolveUploadedImageUrl(file, fallbackUrl = null) {
  if (file instanceof File) {
    return uploadForumPostImage({ file });
  }
  return fallbackUrl || null;
}

async function submitRootPost() {
  if (!props.topic?.id) return;
  const body = String(rootPostBody.value || '').trim();
  if (!body) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    const imageUrl = await resolveUploadedImageUrl(rootImageFile.value);
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
    rootImageFile.value = null;
    threadStatus.value = imageUrl ? 'Ответ с картинкой опубликован.' : 'Ответ опубликован.';
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
    threadStatus.value = imageUrl ? 'Комментарий с картинкой добавлен.' : 'Комментарий к сообщению добавлен.';
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
    const imageUrl = await resolveUploadedImageUrl(editImageFile.value, post?.imageUrl || null);
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

async function submitTopicEdit() {
  if (!props.topic?.id) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: UPDATE_FORUM_TOPIC_MUTATION,
      variables: {
        topicId: props.topic.id,
        input: {
          title: String(topicForm.value.title || '').trim(),
          body: String(topicForm.value.body || '').trim(),
        },
      },
    });
    topicEditMode.value = false;
    threadStatus.value = 'Тема обновлена.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function deleteTopic() {
  if (!props.topic?.id) return;
  const confirmed = globalThis.confirm?.('Убрать тему в архив?') ?? true;
  if (!confirmed) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_FORUM_TOPIC_MUTATION,
      variables: { topicId: props.topic.id },
    });
    threadStatus.value = 'Тема отправлена в архив.';
    emit('refresh');
  } catch (mutationError) {
    threadStatus.value = mutationError.message;
  } finally {
    threadBusy.value = false;
  }
}

async function deletePost(post) {
  if (!post?.id) return;
  const confirmed = globalThis.confirm?.('Скрыть это сообщение?') ?? true;
  if (!confirmed) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: DELETE_FORUM_POST_MUTATION,
      variables: { postId: post.id },
    });
    threadStatus.value = 'Сообщение скрыто.';
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
          <span class="pill">ответов: {{ topic.posts?.length || 0 }}</span>
        </div>
        <h2>{{ topic.title }}</h2>
        <div class="meta">
          <RouterLink v-if="authorLocation(topic.author)" class="user-inline-link" :to="authorLocation(topic.author)">{{ authorLabel(topic.author) }}</RouterLink>
          <template v-else>{{ authorLabel(topic.author) }}</template>
          · {{ formatDate(topic.createdAt) }}
        </div>
      </div>
      <div v-if="isAuthenticated && canManageTopic()" class="inline-actions">
        <button class="btn btn-outline" type="button" :disabled="threadBusy" @click="topicEditMode ? cancelTopicEdit() : startTopicEdit()">
          {{ topicEditMode ? 'Отменить редактирование' : 'Редактировать тему' }}
        </button>
        <button class="btn btn-danger" type="button" :disabled="threadBusy" @click="deleteTopic">
          Удалить тему
        </button>
      </div>
    </div>

    <article class="forum-topic-opening">
      <div class="forum-post-avatar-wrap">
        <img v-if="topic.author?.avatarUrl" :src="topic.author.avatarUrl" class="forum-post-avatar" alt="avatar автора темы" />
        <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(topic.author) }}</div>
      </div>
      <div class="forum-topic-opening-body">
        <div class="forum-post-author-line">
          <strong>
            <RouterLink v-if="authorLocation(topic.author)" class="user-inline-link" :to="authorLocation(topic.author)">{{ authorLabel(topic.author) }}</RouterLink>
            <template v-else>{{ authorLabel(topic.author) }}</template>
          </strong>
          <span v-if="topic.author?.city" class="meta">· {{ topic.author.city }}</span>
        </div>
        <form v-if="topicEditMode" class="stack forum-inline-form" @submit.prevent="submitTopicEdit">
          <div class="field">
            <label for="forum-topic-title">Заголовок темы</label>
            <input id="forum-topic-title" v-model="topicForm.title" class="input" required />
          </div>
          <div class="field">
            <label for="forum-topic-body">Текст темы</label>
            <textarea id="forum-topic-body" v-model="topicForm.body" class="textarea" required />
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="submit" :disabled="threadBusy">{{ threadBusy ? 'Сохраняем…' : 'Сохранить тему' }}</button>
            <button class="btn btn-outline" type="button" :disabled="threadBusy" @click="cancelTopicEdit">Отмена</button>
          </div>
        </form>
        <div v-else class="prewrap">{{ topic.body || 'Текст темы не указан.' }}</div>
      </div>
    </article>

    <hr class="divider" />

    <div class="section-head">
      <h3>Обсуждение</h3>
      <span class="pill">{{ loading ? 'обновляем…' : `${flatPosts.length} сообщений` }}</span>
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="threadStatus" class="message" :class="threadStatus.includes('обновлен') || threadStatus.includes('опубликован') || threadStatus.includes('добавлен') || threadStatus.includes('архив') || threadStatus.includes('скрыто') ? 'success' : 'error'">
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
            <strong>
              <RouterLink v-if="authorLocation(post.author)" class="user-inline-link" :to="authorLocation(post.author)">{{ authorLabel(post.author) }}</RouterLink>
              <template v-else>{{ authorLabel(post.author) }}</template>
            </strong>
            <span v-if="post.author?.city" class="meta">· {{ post.author.city }}</span>
            <span class="meta">· {{ formatDate(post.updatedAt || post.createdAt) }}</span>
          </div>
          <div v-if="post.replyToAuthor" class="forum-reply-note">
            Ответ пользователю:
            <RouterLink v-if="authorLocation(post.replyToAuthor)" class="user-inline-link" :to="authorLocation(post.replyToAuthor)">{{ authorLabel(post.replyToAuthor) }}</RouterLink>
            <template v-else>{{ authorLabel(post.replyToAuthor) }}</template>
          </div>
          <div class="post-body prewrap">{{ post.body }}</div>
          <img v-if="post.imageUrl" :src="post.imageUrl" class="forum-post-image" alt="Картинка к сообщению форума" />

          <div class="inline-actions forum-post-actions">
            <button
              v-if="isAuthenticated"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startReply(post)"
            >
              Ответить
            </button>
            <button
              v-if="isAuthenticated && canManagePost(post)"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startEdit(post)"
            >
              Редактировать
            </button>
            <button
              v-if="isAuthenticated && canManagePost(post)"
              class="btn btn-danger"
              type="button"
              :disabled="threadBusy"
              @click="deletePost(post)"
            >
              Удалить
            </button>
          </div>

          <form v-if="replyTargetId === post.id" class="stack forum-inline-form" @submit.prevent="submitReply(post)">
            <div class="field">
              <label :for="`reply-post-${post.id}`">Ответить на сообщение</label>
              <textarea :id="`reply-post-${post.id}`" v-model="replyBody" class="textarea" required placeholder="Твой ответ" />
            </div>
            <div class="field">
              <label :for="`reply-image-${post.id}`">Картинка к сообщению</label>
              <input :id="`reply-image-${post.id}`" class="input" type="file" accept="image/*" @change="handleReplyImageChange" />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="threadBusy">{{ threadBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
              <button class="btn btn-outline" type="button" :disabled="threadBusy" @click="cancelReply">Отмена</button>
            </div>
          </form>

          <form v-if="editPostId === post.id" class="stack forum-inline-form" @submit.prevent="submitEdit(post)">
            <div class="field">
              <label :for="`edit-post-${post.id}`">Редактировать сообщение</label>
              <textarea :id="`edit-post-${post.id}`" v-model="editBody" class="textarea" required />
            </div>
            <div class="field">
              <label :for="`edit-image-${post.id}`">Заменить картинку</label>
              <input :id="`edit-image-${post.id}`" class="input" type="file" accept="image/*" @change="handleEditImageChange" />
            </div>
            <img v-if="post.imageUrl" :src="post.imageUrl" class="forum-post-image forum-post-image-inline" alt="Текущая картинка сообщения" />
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="threadBusy">{{ threadBusy ? 'Сохраняем…' : 'Сохранить' }}</button>
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
        <textarea id="forum-root-post" v-model="rootPostBody" class="textarea" required placeholder="Твой ответ" />
      </div>
      <div class="field">
        <label for="forum-root-image">Картинка к сообщению</label>
        <input id="forum-root-image" class="input" type="file" accept="image/*" @change="handleRootImageChange" />
      </div>
      <button class="btn btn-primary" type="submit" :disabled="threadBusy">{{ threadBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
    </form>
    <div v-else class="message">Чтобы отвечать в темы, войди или зарегистрируйся в шапке.</div>
  </article>
</template>
