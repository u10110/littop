<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import ForumThreadView from './ForumThreadView.vue';
import { apolloClient } from '../lib/apollo.js';
import { FORUM_TOPIC_QUERY } from '../lib/graphql.js';
import { buildForumTopicLookupVariables } from '../lib/forum.js';
import { normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const { bootstrapSession } = useSession();

const topic = ref(null);
const topicLoading = ref(false);
const topicError = ref('');
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

async function refreshTopicPage() {
  if (!slugOrId.value) return;
  await loadTopicPage(slugOrId.value);
}
</script>

<template>
  <main class="forum-ref topic-ref">
    <section class="topic-layout-single">
      <RouterLink class="back" to="/forum">← Все темы форума</RouterLink>
      <p v-if="topicError" class="ref-error">{{ topicError }}</p>
      <section v-else-if="topicLoading" class="detail-loading">Загружаем тему…</section>
      <section v-else-if="notFound" class="detail-loading">Тема не найдена.</section>
      <ForumThreadView v-else-if="topic" :topic="topic" :loading="topicLoading" :error="topicError" @refresh="refreshTopicPage" />
    </section>
  </main>
</template>
