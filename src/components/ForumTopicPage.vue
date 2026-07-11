<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import ForumThreadView from './ForumThreadView.vue';
import { apolloClient } from '../lib/apollo.js';
import { FORUM_TOPIC_QUERY, INCREMENT_FORUM_TOPIC_VIEWS_MUTATION } from '../lib/graphql.js';
import { buildForumTopicLookupVariables } from '../lib/forum.js';
import { normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const { bootstrapSession } = useSession();

const topic = ref(null);
const topicLoading = ref(false);
const topicError = ref('');
const viewedTopicIds = ref(new Set());
let requestVersion = 0;

const slugOrId = computed(() => normalizeRouteParam(route.params.slugOrId));
const notFound = computed(() => !topicLoading.value && !topicError.value && Boolean(slugOrId.value) && !topic.value);

onMounted(() => {
  bootstrapSession();
});

watch(slugOrId, (value) => {
  loadTopicPage(value);
}, { immediate: true });

async function loadTopicPage(value) {
  const currentRequest = ++requestVersion;
  topic.value = null;
  topicError.value = '';

  if (!value) {
    return;
  }

  topicLoading.value = true;

  try {
    const { data } = await apolloClient.query({
      query: FORUM_TOPIC_QUERY,
      variables: buildForumTopicLookupVariables(value),
      fetchPolicy: 'network-only',
    });

    if (currentRequest !== requestVersion) {
      return;
    }

    topic.value = data?.forumTopic ?? null;
    if (topic.value?.id) {
      await registerTopicView(topic.value.id);
    }
  } catch (queryError) {
    if (currentRequest === requestVersion) {
      topicError.value = queryError.message;
    }
  } finally {
    if (currentRequest === requestVersion) {
      topicLoading.value = false;
    }
  }
}

async function registerTopicView(topicId) {
  const key = String(topicId || '');
  if (!key || viewedTopicIds.value.has(key)) return;
  viewedTopicIds.value.add(key);
  try {
    const { data } = await apolloClient.mutate({
      mutation: INCREMENT_FORUM_TOPIC_VIEWS_MUTATION,
      variables: { topicId: key },
    });
    if (data?.incrementForumTopicViews?.id === topic.value?.id) {
      topic.value = {
        ...topic.value,
        ...data.incrementForumTopicViews,
        posts: Array.isArray(topic.value?.posts) ? topic.value.posts : [],
      };
    }
  } catch {
    // Счётчик не должен ломать загрузку темы.
  }
}

async function refreshTopicPage() {
  if (!slugOrId.value) return;
  await loadTopicPage(slugOrId.value);
}
</script>

<template>
  <section class="page-head">
    <div class="section-head">
      <div>
        <h1>Тема форума</h1>
        <p class="muted">Отдельная страница темы с полным обсуждением, ветками ответов и редактированием только своих сообщений.</p>
        <div v-if="topic" class="chips">
          <span class="pill">просмотров: {{ topic.viewsCount ?? 0 }}</span>
          <span class="pill">ответов: {{ topic.repliesCount ?? 0 }}</span>
        </div>
      </div>
      <RouterLink class="btn btn-outline" to="/forum">← Ко всему форуму</RouterLink>
    </div>
  </section>

  <div v-if="topicError" class="message error">{{ topicError }}</div>

  <section v-if="topicLoading" class="panel stack">
    <div class="empty-state">Загружаем тему…</div>
  </section>

  <section v-else-if="notFound" class="panel stack">
    <div class="empty-state">Тема не найдена.</div>
  </section>

  <ForumThreadView
    v-else-if="topic"
    :topic="topic"
    :loading="topicLoading"
    :error="topicError"
    @refresh="refreshTopicPage"
  />
</template>
