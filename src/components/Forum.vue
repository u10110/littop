<script setup>
import { computed, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';

import { apolloClient } from '../lib/apollo.js';
import { CREATE_FORUM_POST_MUTATION, CREATE_FORUM_TOPIC_MUTATION, FORUM_OVERVIEW_QUERY, FORUM_TOPIC_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate } from '../lib/format.js';
import { useSession } from '../lib/session.js';

const selectedSection = ref('');
const selectedTopicId = ref(null);
const topicDetail = ref(null);
const topicDetailLoading = ref(false);
const topicDetailError = ref('');
const topicStatus = ref('');
const postStatus = ref('');
const topicBusy = ref(false);
const postBusy = ref(false);
const topicForm = ref({
  sectionSlug: 'tm',
  title: '',
  body: '',
});
const postBody = ref('');

const { isAuthenticated } = useSession();

const queryVariables = computed(() => ({
  sectionSlug: selectedSection.value || null,
  limit: 30,
  offset: 0,
}));

const { result, loading, error, refetch } = useQuery(FORUM_OVERVIEW_QUERY, queryVariables, {
  fetchPolicy: 'cache-and-network',
});

const sections = computed(() => result.value?.forumSections ?? []);
const topics = computed(() => result.value?.forumTopics ?? []);

watch(sections, (items) => {
  if (!items.length) {
    selectedSection.value = '';
    return;
  }

  if (!selectedSection.value || !items.some((item) => item.slug === selectedSection.value)) {
    selectedSection.value = items[0].slug;
  }
}, { immediate: true });

watch(selectedSection, (slug) => {
  if (slug) {
    topicForm.value.sectionSlug = slug;
  }
});

watch(topics, (items) => {
  if (!items.length) {
    selectedTopicId.value = null;
    topicDetail.value = null;
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedTopicId.value));
  if (!stillExists) {
    selectedTopicId.value = items[0].id;
  }
}, { immediate: true });

watch(selectedTopicId, (topicId) => {
  if (!topicId) {
    topicDetail.value = null;
    return;
  }
  loadTopic(topicId);
}, { immediate: true });

async function loadTopic(topicId) {
  topicDetailLoading.value = true;
  topicDetailError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: FORUM_TOPIC_QUERY,
      variables: { topicId },
      fetchPolicy: 'network-only',
    });
    topicDetail.value = data?.forumTopic ?? null;
  } catch (queryError) {
    topicDetail.value = null;
    topicDetailError.value = queryError.message;
  } finally {
    topicDetailLoading.value = false;
  }
}

async function submitTopic() {
  topicBusy.value = true;
  topicStatus.value = '';

  try {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_FORUM_TOPIC_MUTATION,
      variables: {
        input: {
          sectionSlug: topicForm.value.sectionSlug,
          title: topicForm.value.title.trim(),
          body: topicForm.value.body.trim(),
        },
      },
    });
    topicForm.value.title = '';
    topicForm.value.body = '';
    topicStatus.value = 'Тема создана.';
    await refetch();
    selectedTopicId.value = data?.createForumTopic?.id ?? selectedTopicId.value;
  } catch (mutationError) {
    topicStatus.value = mutationError.message;
  } finally {
    topicBusy.value = false;
  }
}

async function submitPost() {
  if (!topicDetail.value) return;
  postBusy.value = true;
  postStatus.value = '';

  try {
    await apolloClient.mutate({
      mutation: CREATE_FORUM_POST_MUTATION,
      variables: {
        topicId: topicDetail.value.id,
        body: postBody.value.trim(),
        parentPostId: null,
      },
    });
    postBody.value = '';
    postStatus.value = 'Ответ опубликован.';
    await Promise.all([refetch(), loadTopic(topicDetail.value.id)]);
  } catch (mutationError) {
    postStatus.value = mutationError.message;
  } finally {
    postBusy.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <h1>Форум</h1>
    <p class="muted">
      Форумная страница теперь работает через GraphQL: секции, список тем, детальная тема с постами,
      создание новой темы и ответы — всё идёт через backend.
    </p>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="panel stack">
    <div class="section-head">
      <h2>Секции</h2>
      <span class="pill">{{ loading ? 'загрузка…' : `${sections.length} секций` }}</span>
    </div>
    <div class="chips">
      <button
        v-for="section in sections"
        :key="section.id"
        class="btn"
        :class="section.slug === selectedSection ? 'btn-primary' : 'btn-outline'"
        type="button"
        @click="selectedSection = section.slug"
      >
        {{ section.name }}
      </button>
    </div>
  </section>

  <section class="layout-columns">
    <div class="stack">
      <div class="section-head">
        <h2>Темы</h2>
        <span class="pill">{{ loading ? 'загрузка…' : `${topics.length} тем` }}</span>
      </div>

      <div v-if="topics.length" class="stack">
        <article
          v-for="topic in topics"
          :key="topic.id"
          class="card clickable"
          :class="{ 'is-selected': String(topic.id) === String(selectedTopicId) }"
          @click="selectedTopicId = topic.id"
        >
          <div class="chips">
            <span class="pill">{{ topic.sectionSlug }}</span>
            <span v-if="topic.isPinned" class="pill warn">закреп</span>
            <span class="pill">ответов: {{ topic.repliesCount }}</span>
          </div>
          <h3>{{ topic.title }}</h3>
          <div class="meta">
            {{ topic.author?.displayName || topic.author?.login }} · {{ formatDate(topic.lastPostAt || topic.createdAt) }}
          </div>
          <div>{{ excerptText(topic.body, 160) }}</div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">В выбранной секции пока нет тем.</div>

      <article v-if="isAuthenticated" class="panel stack">
        <div class="section-head">
          <h2>Новая тема</h2>
          <span class="pill good">mutation createForumTopic</span>
        </div>

        <form class="stack" @submit.prevent="submitTopic">
          <div class="field">
            <label for="forum-section">Секция</label>
            <select id="forum-section" v-model="topicForm.sectionSlug" class="select">
              <option v-for="section in sections" :key="section.id" :value="section.slug">{{ section.name }}</option>
            </select>
          </div>
          <div class="field">
            <label for="forum-title">Заголовок</label>
            <input id="forum-title" v-model="topicForm.title" class="input" required />
          </div>
          <div class="field">
            <label for="forum-body">Текст</label>
            <textarea id="forum-body" v-model="topicForm.body" class="textarea" required />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="topicBusy">{{ topicBusy ? 'Создаём…' : 'Создать тему' }}</button>
          <div v-if="topicStatus" class="message" :class="topicStatus.includes('создана') ? 'success' : 'error'">{{ topicStatus }}</div>
        </form>
      </article>
    </div>

    <div class="stack">
      <article v-if="topicDetail" class="panel stack">
        <div class="section-head">
          <h2>{{ topicDetail.title }}</h2>
          <span class="pill">{{ topicDetail.sectionSlug }}</span>
        </div>
        <div class="meta">
          {{ topicDetail.author?.displayName || topicDetail.author?.login }} · {{ formatDate(topicDetail.createdAt) }}
        </div>
        <div class="prewrap">{{ topicDetail.body || 'Текст темы не указан.' }}</div>

        <hr class="divider" />

        <div class="section-head">
          <h3>Ответы</h3>
          <span class="pill">{{ topicDetailLoading ? 'обновляем…' : `${topicDetail.posts?.length || 0} постов` }}</span>
        </div>
        <div v-if="topicDetailError" class="message error">{{ topicDetailError }}</div>
        <div v-if="topicDetail.posts?.length" class="stack">
          <article v-for="post in topicDetail.posts" :key="post.id" class="topic-post">
            <strong>{{ post.author?.displayName || post.author?.login || 'Пользователь' }}</strong>
            <div class="meta">{{ formatDate(post.createdAt) }}</div>
            <div class="post-body">{{ post.body }}</div>
          </article>
        </div>
        <div v-else-if="!topicDetailLoading" class="empty-state">Пока без ответов — можно запустить обсуждение первым.</div>

        <form v-if="isAuthenticated" class="stack" @submit.prevent="submitPost">
          <div class="field">
            <label for="forum-post-body">Ответить в тему</label>
            <textarea id="forum-post-body" v-model="postBody" class="textarea" required placeholder="Твой ответ" />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="postBusy">{{ postBusy ? 'Публикуем…' : 'Опубликовать ответ' }}</button>
          <div v-if="postStatus" class="message" :class="postStatus.includes('опубликован') ? 'success' : 'error'">{{ postStatus }}</div>
        </form>
        <div v-else class="message">Чтобы отвечать в темы, войди или зарегистрируйся в шапке.</div>
      </article>

      <div v-else class="empty-state">Выбери тему слева, чтобы увидеть её сообщения и форму ответа.</div>
    </div>
  </section>
</template>
