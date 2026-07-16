<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useQuery, useMutation } from '@vue/apollo-composable';

import {
  FORUM_OVERVIEW_QUERY,
  FORUM_SECTIONS_QUERY,
  CREATE_FORUM_TOPIC_MUTATION,
} from '../lib/graphql.js';
import { formatDateTime, excerptText } from '../lib/format.js';
import {
  buildAuthorPageLocation,
  buildForumTopicPageLocation,
} from '../lib/routes.js';
import {
  getAuthorDisplayName,
  getAuthorInitial,
} from '../lib/forum.js';
import { useSession } from '../lib/session.js';

const { isAuthenticated } = useSession();
const router = useRouter();

const activeSection = ref(null);
const searchQuery = ref('');

const { result, loading, error, refetch } = useQuery(
  FORUM_OVERVIEW_QUERY,
  computed(() => ({
    sectionSlug: activeSection.value || null,
    limit: 20,
    offset: 0,
  })),
  { fetchPolicy: 'cache-and-network' },
);

const { result: sectionsResult } = useQuery(FORUM_SECTIONS_QUERY);
const sections = computed(() => sectionsResult.value?.forumSections ?? []);
const topics = computed(() => result.value?.forumTopics ?? []);
const loadError = computed(() => error.value?.message || '');

const displayTopics = computed(() => {
  const q = String(searchQuery.value || '').trim().toLowerCase();
  if (!q) return topics.value;
  return topics.value.filter((t) => {
    const hay = `${t.title || ''} ${t.body || ''} ${authorLabel(t.author)}`.toLowerCase();
    return hay.includes(q);
  });
});

const fallbackSection = computed(() => sections.value[0]?.slug || '');
const activeSectionName = computed(() =>
  sections.value.find((s) => s.slug === activeSection.value)?.name || '',
);

const showNewTopicModal = ref(false);
const newTopicSection = ref('');
const newTopicTitle = ref('');
const newTopicBody = ref('');
const newTopicBusy = ref(false);
const newTopicError = ref('');
const newTopicImageFile = ref(null);

const { mutate: createTopicMutation } = useMutation(CREATE_FORUM_TOPIC_MUTATION);

watch(activeSection, () => {
  refetch();
});

function openAuthModal(mode = 'login') {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } }));
}

function authorLabel(author) {
  return getAuthorDisplayName(author);
}

function authorInitial(author) {
  return getAuthorInitial(author);
}

function lastPosts(topic) {
  const posts = Array.isArray(topic?.posts) ? topic.posts : [];
  return posts.slice(-3);
}

function replyWord(n) {
  const v = Number(n) || 0;
  const mod10 = v % 10;
  const mod100 = v % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ответ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'ответа';
  return 'ответов';
}

function handleImageChange(event) {
  newTopicImageFile.value = event?.target?.files?.[0] ?? null;
}

async function resolveUploadedImageUrl(file) {
  if (file instanceof File) {
    const { uploadForumTopicImage } = await import('../lib/forumImages.js');
    return uploadForumTopicImage({ file });
  }
  return null;
}

async function submitNewTopic() {
  newTopicBusy.value = true;
  newTopicError.value = '';
  try {
    const imageUrl = await resolveUploadedImageUrl(newTopicImageFile.value);
    const { data } = await createTopicMutation({
      variables: {
        input: {
          sectionSlug: newTopicSection.value || fallbackSection.value,
          title: newTopicTitle.value.trim(),
          body: newTopicBody.value.trim(),
          imageUrl,
        },
      },
    });
    const created = data?.createForumTopic;
    newTopicSection.value = '';
    newTopicTitle.value = '';
    newTopicBody.value = '';
    newTopicImageFile.value = null;
    showNewTopicModal.value = false;
    if (created?.id) {
      await refetch();
      router.push(buildForumTopicPageLocation(created));
    }
  } catch (e) {
    newTopicError.value = e?.message || 'Не удалось создать тему.';
  } finally {
    newTopicBusy.value = false;
  }
}
</script>

<template>
  <main>
    <section v-if="!isAuthenticated || loadError" class="panel stack forum-auth-note">
      <div class="section-head">
        <h1 class="forum-page-title"><Icon name="messages-square" />Форум</h1>
        <button
          v-if="isAuthenticated"
          class="btn btn-primary"
          type="button"
          :disabled="newTopicBusy"
          @click="showNewTopicModal = true"
        >
          <Icon name="plus" />Новая тема
        </button>
        <button
          v-else
          class="btn btn-primary"
          type="button"
          @click="openAuthModal('login')"
        >
          Войти, чтобы писать на форуме
        </button>
      </div>
      <p v-if="loadError" class="message error">{{ loadError }}</p>
    </section>

    <!-- ФИЛЬТРЫ -->
    <div class="filters forum-filters">
      <button
        v-if="isAuthenticated"
        class="btn btn-primary"
        type="button"
        :disabled="newTopicBusy"
        @click="showNewTopicModal = true"
      >
        <Icon name="plus" />Новая тема
      </button>

      <div class="field" style="min-width: 260px; flex: 2;">
        <span class="label"><Icon name="search" />Поиск</span>
        <input
          v-model="searchQuery"
          class="input"
          placeholder="Поиск по форуму"
        />
      </div>
    </div>

    <!-- БЛОК СЕКЦИИ -->
    <section class="forum-sections-block">
      <div class="section-head forum-sections-head">
        <h2 class="forum-sections-title"><Icon name="layers" />Секции</h2>
        <span v-if="activeSectionName" class="pill">{{ activeSectionName }}</span>
      </div>
      <div class="forum-sections-chips">
        <button
          type="button"
          class="chip"
          :class="{ 'chip-active': activeSection === null }"
          @click="activeSection = null"
        >Все темы</button>
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          class="chip"
          :class="{ 'chip-active': activeSection === section.slug }"
          @click="activeSection = section.slug"
        >{{ section.name }}</button>
      </div>
    </section>

    <!-- СПИСОК ТЕМ (одна широкая колонка) -->
    <section class="forum-list">
      <div v-if="loading && !displayTopics.length" class="message">Загрузка тем…</div>

      <div v-if="displayTopics.length" class="stack forum-topics">
        <article
          v-for="topic in displayTopics"
          :key="topic.id"
          class="forum-topic-card forum-topic-card--rich"
        >
          <header class="forum-topic-card-head">
            <div class="forum-post-avatar-wrap">
              <img
                v-if="topic.author?.avatarUrl"
                :src="topic.author.avatarUrl"
                class="forum-post-avatar"
                :alt="`Аватар ${authorLabel(topic.author)}`"
              />
              <div v-else class="forum-post-avatar forum-post-avatar-fallback">
                {{ authorInitial(topic.author) }}
              </div>
            </div>
            <div class="forum-topic-card-body">
              <div class="forum-topic-meta">
                <RouterLink
                  v-if="topic.author?.login"
                  class="user-inline-link"
                  :to="buildAuthorPageLocation(topic.author)"
                >
                  <strong>{{ authorLabel(topic.author) }}</strong>
                </RouterLink>
                <span v-else class="meta">{{ authorLabel(topic.author) }}</span>
                <span class="meta">· {{ topic.sectionSlug }}</span>
                <span class="meta">· добавлено: {{ formatDateTime(topic.createdAt) }}</span>
              </div>
              <RouterLink class="forum-topic-title" :to="buildForumTopicPageLocation(topic)">
                {{ topic.title }}
              </RouterLink>
              <p v-if="topic.body" class="forum-topic-excerpt">
                {{ excerptText(topic.body, 240) }}
              </p>
            </div>
          </header>

          <section v-if="lastPosts(topic).length" class="forum-topic-last-posts">
            <div class="section-head forum-topic-last-posts-head">
              <h4>Последние сообщения</h4>
              <span class="pill">{{ topic.repliesCount }} {{ replyWord(topic.repliesCount) }}</span>
            </div>
            <div class="stack forum-topic-last-posts-list">
              <div v-for="post in lastPosts(topic)" :key="post.id" class="forum-last-post">
                <div class="forum-post-avatar-wrap forum-post-avatar-wrap-sm">
                  <img
                    v-if="post.author?.avatarUrl"
                    :src="post.author.avatarUrl"
                    class="forum-post-avatar forum-post-avatar-sm"
                    :alt="`Аватар ${authorLabel(post.author)}`"
                  />
                  <div v-else class="forum-post-avatar forum-post-avatar-sm forum-post-avatar-fallback">
                    {{ authorInitial(post.author) }}
                  </div>
                </div>
                <div class="forum-last-post-body">
                  <div class="forum-post-author-line">
                    <RouterLink
                      v-if="post.author?.login"
                      class="user-inline-link"
                      :to="buildAuthorPageLocation(post.author)"
                    >
                      <strong>{{ authorLabel(post.author) }}</strong>
                    </RouterLink>
                    <span v-else class="meta">{{ authorLabel(post.author) }}</span>
                    <span class="meta">· {{ formatDateTime(post.createdAt) }}</span>
                  </div>
                  <div class="prewrap forum-last-post-text">{{ excerptText(post.body, 200) }}</div>
                  <RouterLink class="forum-goto-link" :to="buildForumTopicPageLocation(topic)">
                    перейти →
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>

          <div class="inline-actions forum-topic-card-actions">
            <RouterLink class="btn btn-outline" :to="buildForumTopicPageLocation(topic)">
              Открыть тему
            </RouterLink>
            <span v-if="topic.isPinned" class="pill warn">закреплено</span>
          </div>
        </article>
      </div>

      <div v-else-if="!loading" class="message empty">
        Тем пока нет. {{ isAuthenticated ? 'Создайте первую!' : 'Войдите, чтобы написать.' }}
      </div>

      <div v-if="loadError" class="message error">{{ loadError }}</div>
    </section>

    <!-- МОДАЛКА СОЗДАНИЯ ТЕМЫ -->
    <div v-if="showNewTopicModal" class="modal-backdrop" @click.self="showNewTopicModal = false">
      <div class="auth-modal panel stack" role="dialog" aria-modal="true">
        <div class="section-head">
          <h2><Icon name="plus" />Новая тема</h2>
          <button class="btn btn-ghost modal-close" type="button" @click="showNewTopicModal = false" aria-label="Закрыть"><Icon name="x" /></button>
        </div>

        <div v-if="newTopicError" class="message error">{{ newTopicError }}</div>

        <form class="stack" @submit.prevent="submitNewTopic">
          <div class="field">
            <label for="new-topic-section">Раздел</label>
            <select id="new-topic-section" v-model="newTopicSection" class="select" required>
              <option value="" disabled>Выберите раздел</option>
              <option v-for="section in sections" :key="section.id" :value="section.slug">
                {{ section.name }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="new-topic-title">Заголовок</label>
            <input id="new-topic-title" v-model="newTopicTitle" class="input" required />
          </div>
          <div class="field">
            <label for="new-topic-body">Текст темы</label>
            <textarea id="new-topic-body" v-model="newTopicBody" class="textarea" required></textarea>
          </div>
          <div class="field">
            <label>Картинка (необязательно)</label>
            <input type="file" accept="image/*" @change="handleImageChange" />
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="submit" :disabled="newTopicBusy">
              <Icon name="send" />{{ newTopicBusy ? 'Создаём…' : 'Создать тему' }}
            </button>
            <button class="btn btn-outline" type="button" :disabled="newTopicBusy" @click="showNewTopicModal = false">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.forum-sections-block {
  margin: 0 0 1.25rem;
}
.forum-sections-title {
  font-size: 1.15rem;
  margin: 0;
}
.forum-sections-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.chip {
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: inherit;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.92rem;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chip:hover {
  border-color: var(--accent, #6b8cff);
}
.chip-active {
  background: var(--accent, #6b8cff);
  color: #fff;
  border-color: var(--accent, #6b8cff);
}
</style>
