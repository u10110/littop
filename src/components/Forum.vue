<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';

import ForumThreadView from './ForumThreadView.vue';
import { apolloClient } from '../lib/apollo.js';
import { CREATE_FORUM_TOPIC_MUTATION, FORUM_OVERVIEW_QUERY, FORUM_TOPIC_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate } from '../lib/format.js';
import { buildForumTopicLookupVariables, getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildAuthorPageLocation, buildForumTopicPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { uploadForumTopicImage } from '../lib/forumImages.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();
const selectedSection = ref(normalizeRouteParam(route.query.section));
const selectedTopicId = ref(null);
const topicDetail = ref(null);
const topicDetailLoading = ref(false);
const topicDetailError = ref('');
const topicStatus = ref('');
const topicBusy = ref(false);
let topicRequestVersion = 0;
const topicForm = ref({
  sectionSlug: 'tm',
  title: '',
  body: '',
});
const topicImageFile = ref(null);
const topicImagePreviewUrl = ref('');

function handleTopicImageChange(event) {
  const file = event?.target?.files?.[0] ?? null;
  topicImageFile.value = file;
  topicImagePreviewUrl.value = file ? URL.createObjectURL(file) : '';
}

const { isAuthenticated, bootstrapSession } = useSession();

const queryVariables = computed(() => ({
  sectionSlug: selectedSection.value || null,
  limit: 30,
  offset: 0,
}));

const { result, loading, error, refetch } = useQuery(FORUM_OVERVIEW_QUERY, queryVariables, {
  fetchPolicy: 'network-only',
});

const sections = computed(() => result.value?.forumSections ?? []);
const topics = computed(() => result.value?.forumTopics ?? []);

onMounted(() => {
  bootstrapSession();
});

watch(sections, (items) => {
  if (!items.length) {
    topicForm.value.sectionSlug = '';
    return;
  }

  const stillExists = items.some((item) => item.slug === topicForm.value.sectionSlug);
  if (!stillExists) {
    topicForm.value.sectionSlug = items[0].slug;
  }
}, { immediate: true });

watch(() => route.query.section, (rawSection) => {
  const normalized = normalizeRouteParam(rawSection);
  if (normalized !== selectedSection.value) {
    selectedSection.value = normalized;
  }
}, { immediate: true });

watch(selectedSection, (slug, previousSlug) => {
  const normalizedRouteSection = normalizeRouteParam(route.query.section);
  if (slug !== normalizedRouteSection) {
    const nextQuery = { ...route.query };
    if (slug) nextQuery.section = slug;
    else delete nextQuery.section;
    router.replace({ query: nextQuery });
  }

  if (slug) {
    topicForm.value.sectionSlug = slug;
  }

  if (slug !== previousSlug) {
    topicRequestVersion += 1;
    selectedTopicId.value = null;
    topicDetail.value = null;
    topicDetailLoading.value = false;
    topicDetailError.value = '';
  }
});

watch(topics, (items) => {
  if (!items.length) {
    topicRequestVersion += 1;
    selectedTopicId.value = null;
    topicDetail.value = null;
    topicDetailLoading.value = false;
    topicDetailError.value = '';
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedTopicId.value));
  if (!stillExists) {
    topicRequestVersion += 1;
    selectedTopicId.value = null;
    topicDetail.value = null;
    topicDetailLoading.value = false;
    topicDetailError.value = '';
  }
}, { immediate: true });

watch(selectedTopicId, (topicId) => {
  if (!topicId) {
    topicRequestVersion += 1;
    topicDetail.value = null;
    topicDetailLoading.value = false;
    topicDetailError.value = '';
    return;
  }
  loadTopic(topicId);
}, { immediate: true });

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function authorInitial(author) {
  return getAuthorInitial(author);
}

async function loadTopic(topicId) {
  const requestVersion = ++topicRequestVersion;
  topicDetailLoading.value = true;
  topicDetailError.value = '';

  try {
    const { data } = await apolloClient.query({
      query: FORUM_TOPIC_QUERY,
      variables: buildForumTopicLookupVariables(topicId),
      fetchPolicy: 'network-only',
    });

    if (requestVersion !== topicRequestVersion) {
      return;
    }

    topicDetail.value = data?.forumTopic ?? null;
  } catch (queryError) {
    if (requestVersion !== topicRequestVersion) {
      return;
    }

    topicDetail.value = null;
    topicDetailError.value = queryError.message;
  } finally {
    if (requestVersion === topicRequestVersion) {
      topicDetailLoading.value = false;
    }
  }
}

async function refreshTopicDetail() {
  if (!selectedTopicId.value) return;
  await Promise.all([refetch(), loadTopic(selectedTopicId.value)]);
}

async function submitTopic() {
  topicBusy.value = true;
  topicStatus.value = '';

  try {
    const imageUrl = topicImageFile.value instanceof File
      ? await uploadForumTopicImage({ file: topicImageFile.value })
      : '';
    const { data } = await apolloClient.mutate({
      mutation: CREATE_FORUM_TOPIC_MUTATION,
      variables: {
        input: {
          sectionSlug: topicForm.value.sectionSlug,
          title: topicForm.value.title.trim(),
          body: topicForm.value.body.trim(),
          imageUrl,
        },
      },
    });
    topicForm.value.title = '';
    topicForm.value.body = '';
    topicImageFile.value = null;
    topicImagePreviewUrl.value = '';
    topicStatus.value = 'Тема создана.';
    await refetch();
    selectedTopicId.value = data?.createForumTopic?.id ?? selectedTopicId.value;
  } catch (mutationError) {
    topicStatus.value = mutationError.message;
  } finally {
    topicBusy.value = false;
  }
}
</script>

<template>
  <section class="page-head">
    <h1>Форум</h1>
    <p class="muted">
      Темы открываются и в split-view, и отдельной страницей. Ответы поддерживают ветки, а редактирование доступно только автору собственного сообщения.
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
        class="btn"
        :class="selectedSection ? 'btn-outline' : 'btn-primary'"
        type="button"
        @click="selectedSection = ''"
      >
        Все секции
      </button>
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

  <section class="layout-columns forum-layout-columns">
    <div class="stack">
      <div class="section-head">
        <h2>Темы</h2>
        <div class="inline-actions">
          <RouterLink v-if="isAuthenticated" class="btn btn-primary" to="/forum#forum-new-topic-form">
            Добавить тему
          </RouterLink>
          <span class="pill">{{ loading ? 'загрузка…' : `${topics.length} тем` }}</span>
        </div>
      </div>

      <div v-if="topics.length" class="stack">
        <article
          v-for="topic in topics"
          :key="topic.id"
          class="card clickable forum-topic-card"
          :class="{ 'is-selected': String(topic.id) === String(selectedTopicId) }"
          @click="selectedTopicId = topic.id"
        >
          <div class="forum-topic-card-head">
            <div class="forum-post-avatar-wrap forum-post-avatar-wrap-sm">
              <img v-if="topic.author?.avatarUrl" :src="topic.author.avatarUrl" class="forum-post-avatar forum-post-avatar-sm" alt="avatar автора темы" />
              <div v-else class="forum-post-avatar forum-post-avatar-fallback forum-post-avatar-sm">{{ authorInitial(topic.author) }}</div>
            </div>
            <div class="forum-topic-card-body">
              <div class="chips">
                <span class="pill">{{ topic.sectionSlug }}</span>
                <span v-if="topic.isPinned" class="pill warn">закреп</span>
                <span class="pill">ответов: {{ topic.repliesCount }}</span>
                <span class="pill">просмотров: {{ topic.viewsCount }}</span>
              </div>
              <div class="section-head forum-topic-card-title-row">
                <h3>{{ topic.title }}</h3>
                <RouterLink class="btn btn-outline btn-sm" :to="buildForumTopicPageLocation(topic)" @click.stop>
                  Открыть тему
                </RouterLink>
              </div>
              <div class="meta">
                <RouterLink v-if="topic.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(topic.author)">{{ authorLabel(topic.author) }}</RouterLink>
                <template v-else>{{ authorLabel(topic.author) }}</template>
                · создана {{ formatDate(topic.createdAt) }}
              </div>
            </div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">В выбранной секции пока нет тем.</div>

      <article v-if="isAuthenticated" id="forum-new-topic-form" class="panel stack">
        <div class="section-head">
          <h2>Новая тема</h2>
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
          <div class="field">
            <label for="forum-image">Картинка темы (необязательно)</label>
            <input id="forum-image" type="file" accept="image/*" @change="handleTopicImageChange" />
            <img v-if="topicImagePreviewUrl" :src="topicImagePreviewUrl" class="forum-topic-preview-image" alt="превью картинки темы" />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="topicBusy">{{ topicBusy ? 'Создаём…' : 'Создать тему' }}</button>
          <div v-if="topicStatus" class="message" :class="topicStatus.includes('создана') ? 'success' : 'error'">{{ topicStatus }}</div>
        </form>
      </article>
    </div>

    <div class="stack">
      <ForumThreadView
        v-if="topicDetail || topicDetailLoading || topicDetailError"
        :topic="topicDetail"
        :loading="topicDetailLoading"
        :error="topicDetailError"
        @refresh="refreshTopicDetail"
      />
      <div v-else class="empty-state">Выбери тему слева или открой её отдельной страницей.</div>
    </div>
  </section>
</template>
