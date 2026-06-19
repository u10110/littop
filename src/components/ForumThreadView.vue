<script setup>
import { computed, onMounted, ref, watch } from 'vue';

import { apolloClient } from '../lib/apollo.js';
import { CREATE_FORUM_POST_MUTATION, UPDATE_FORUM_POST_MUTATION } from '../lib/graphql.js';
import { formatDate } from '../lib/format.js';
import { flattenForumPostTree, getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
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
const replyTargetId = ref(null);
const replyBody = ref('');
const editPostId = ref(null);
const editBody = ref('');

const flatPosts = computed(() => flattenForumPostTree(props.topic?.posts ?? []));
const currentUserId = computed(() => String(currentUser.value?.id || ''));

onMounted(() => {
  bootstrapSession();
});

watch(() => props.topic?.id, () => {
  resetComposer();
}, { immediate: true });

function resetComposer() {
  rootPostBody.value = '';
  replyTargetId.value = null;
  replyBody.value = '';
  editPostId.value = null;
  editBody.value = '';
  threadStatus.value = '';
}

function isOwnPost(post) {
  return Boolean(currentUserId.value) && String(post?.userId || '') === currentUserId.value;
}

function startReply(post) {
  replyTargetId.value = post?.id ?? null;
  replyBody.value = '';
  editPostId.value = null;
  editBody.value = '';
  threadStatus.value = '';
}

function cancelReply() {
  replyTargetId.value = null;
  replyBody.value = '';
}

function startEdit(post) {
  editPostId.value = post?.id ?? null;
  editBody.value = String(post?.body || '');
  replyTargetId.value = null;
  replyBody.value = '';
  threadStatus.value = '';
}

function cancelEdit() {
  editPostId.value = null;
  editBody.value = '';
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

async function submitRootPost() {
  if (!props.topic?.id) return;
  const body = String(rootPostBody.value || '').trim();
  if (!body) return;

  threadBusy.value = true;
  threadStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: CREATE_FORUM_POST_MUTATION,
      variables: {
        topicId: props.topic.id,
        body,
        parentPostId: null,
      },
    });
    rootPostBody.value = '';
    threadStatus.value = 'Ответ опубликован.';
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
    await apolloClient.mutate({
      mutation: CREATE_FORUM_POST_MUTATION,
      variables: {
        topicId: props.topic.id,
        body,
        parentPostId: post.id,
      },
    });
    replyBody.value = '';
    replyTargetId.value = null;
    threadStatus.value = 'Комментарий к сообщению добавлен.';
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
    await apolloClient.mutate({
      mutation: UPDATE_FORUM_POST_MUTATION,
      variables: {
        postId: post.id,
        body,
      },
    });
    editPostId.value = null;
    editBody.value = '';
    threadStatus.value = 'Сообщение обновлено.';
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
          {{ authorLabel(topic.author) }} · {{ formatDate(topic.createdAt) }}
        </div>
      </div>
    </div>

    <article class="forum-topic-opening">
      <div class="forum-post-avatar-wrap">
        <img v-if="topic.author?.avatarUrl" :src="topic.author.avatarUrl" class="forum-post-avatar" alt="avatar автора темы" />
        <div v-else class="forum-post-avatar forum-post-avatar-fallback">{{ authorInitial(topic.author) }}</div>
      </div>
      <div class="forum-topic-opening-body">
        <div class="forum-post-author-line">
          <strong>{{ authorLabel(topic.author) }}</strong>
          <span v-if="topic.author?.city" class="meta">· {{ topic.author.city }}</span>
        </div>
        <div class="prewrap">{{ topic.body || 'Текст темы не указан.' }}</div>
      </div>
    </article>

    <hr class="divider" />

    <div class="section-head">
      <h3>Обсуждение</h3>
      <span class="pill">{{ loading ? 'обновляем…' : `${flatPosts.length} сообщений` }}</span>
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="threadStatus" class="message" :class="threadStatus.includes('обновлено') || threadStatus.includes('опубликован') || threadStatus.includes('добавлен') ? 'success' : 'error'">
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
            <strong>{{ authorLabel(post.author) }}</strong>
            <span v-if="post.author?.city" class="meta">· {{ post.author.city }}</span>
            <span class="meta">· {{ formatDate(post.updatedAt || post.createdAt) }}</span>
          </div>
          <div v-if="post.replyToAuthor" class="forum-reply-note">Ответ пользователю: {{ authorLabel(post.replyToAuthor) }}</div>
          <div class="post-body prewrap">{{ post.body }}</div>

          <div class="inline-actions forum-post-actions">
            <button
              v-if="isAuthenticated"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startReply(post)"
            >
              Добавить комментарий
            </button>
            <button
              v-if="isAuthenticated && isOwnPost(post)"
              class="btn btn-outline"
              type="button"
              :disabled="threadBusy"
              @click="startEdit(post)"
            >
              Редактировать
            </button>
          </div>

          <form v-if="replyTargetId === post.id" class="stack forum-inline-form" @submit.prevent="submitReply(post)">
            <div class="field">
              <label :for="`reply-post-${post.id}`">Ответить на сообщение</label>
              <textarea :id="`reply-post-${post.id}`" v-model="replyBody" class="textarea" required placeholder="Твой ответ" />
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
      <button class="btn btn-primary" type="submit" :disabled="threadBusy">{{ threadBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
    </form>
    <div v-else class="message">Чтобы отвечать в темы, войди или зарегистрируйся в шапке.</div>
  </article>
</template>
