<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';
import { apolloClient } from '../lib/apollo.js';
import { CREATE_FORUM_TOPIC_MUTATION, FORUM_OVERVIEW_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate } from '../lib/format.js';
import { getAuthorDisplayName, getAuthorInitial } from '../lib/forum.js';
import { buildForumTopicPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const selectedSection = ref('');
const topicStatus = ref('');
const topicBusy = ref(false);
const topicForm = ref({ sectionSlug: 'tm', title: '', body: '' });
const { isAuthenticated, bootstrapSession } = useSession();
const queryVariables = computed(() => ({ sectionSlug: selectedSection.value || null, limit: 30, offset: 0 }));
const { result, loading, error, refetch } = useQuery(FORUM_OVERVIEW_QUERY, queryVariables, { fetchPolicy: 'network-only' });
const sections = computed(() => result.value?.forumSections ?? []);
const topics = computed(() => result.value?.forumTopics ?? []);
onMounted(bootstrapSession);
watch(sections, (items) => { if (items.length && !items.some((item) => item.slug === topicForm.value.sectionSlug)) topicForm.value.sectionSlug = items[0].slug; }, { immediate: true });
function authorLabel(author) { return getAuthorDisplayName(author); }
function authorInitial(author) { return getAuthorInitial(author); }
function clearSection() { selectedSection.value = ''; }
async function submitTopic() {
  topicBusy.value = true; topicStatus.value = '';
  try {
    await apolloClient.mutate({ mutation: CREATE_FORUM_TOPIC_MUTATION, variables: { input: { sectionSlug: topicForm.value.sectionSlug, title: topicForm.value.title.trim(), body: topicForm.value.body.trim() } } });
    topicForm.value.title = ''; topicForm.value.body = ''; topicStatus.value = 'Тема создана.'; await refetch();
  } catch (mutationError) { topicStatus.value = mutationError.message; } finally { topicBusy.value = false; }
}
</script>

<template>
  <main class="forum-ref">
    <section class="forum-layout">
      <div class="forum-main">
        <header class="forum-ref-head"><div><span class="catalog-kicker">Сообщество Littop</span><h1>Форум</h1><p>Обсуждайте литературу, делитесь опытом и находите единомышленников.</p></div><a v-if="isAuthenticated" class="btn btn-primary" href="#new-topic">Создать тему</a></header>
        <nav class="forum-controls"><button type="button" :class="{ active: !selectedSection }" @click="clearSection">Все темы</button><button v-for="section in sections" :key="section.id" type="button" :class="{ active: selectedSection === section.slug }" @click="selectedSection = section.slug">{{ section.name }}</button></nav>
        <p v-if="error" class="ref-error">Не удалось загрузить форум: {{ error.message }}</p>
        <p v-else-if="loading && !result" class="ref-loading">Загружаем темы…</p>
        <section v-else-if="topics.length" class="forum-topic-list"><article v-for="topic in topics" :key="topic.id" class="forum-topic-card"><RouterLink class="topic-avatar" :to="buildForumTopicPageLocation(topic)"><img v-if="topic.author?.avatarUrl" :src="topic.author.avatarUrl" :alt="authorLabel(topic.author)"><span v-else>{{ authorInitial(topic.author) }}</span></RouterLink><div class="forum-topic-copy"><div class="forum-topic-meta"><span>{{ topic.sectionSlug }}</span><span v-if="topic.isPinned">Закреплено</span></div><h2><RouterLink :to="buildForumTopicPageLocation(topic)">{{ topic.title }}</RouterLink></h2><p>{{ excerptText(topic.body, 190) }}</p><footer><RouterLink v-if="topic.author?.login" :to="`/authors/${topic.author.login}`">{{ authorLabel(topic.author) }}</RouterLink><span>{{ formatDate(topic.lastPostAt || topic.createdAt) }}</span><span>◉ {{ topic.viewsCount || 0 }}</span><span>💬 {{ topic.repliesCount }}</span></footer></div><RouterLink class="forum-open" :to="buildForumTopicPageLocation(topic)">Открыть →</RouterLink></article></section>
        <section v-else class="catalog-empty"><h2>Тем в этой секции пока нет</h2><p>Попробуйте выбрать другой раздел или создайте первую тему.</p><button type="button" @click="clearSection">Все секции</button></section>
        <section v-if="isAuthenticated" id="new-topic" class="forum-new-topic"><div><span class="catalog-kicker">Новая публикация</span><h2>Создать тему</h2></div><form @submit.prevent="submitTopic"><label>Раздел<select v-model="topicForm.sectionSlug"><option v-for="section in sections" :key="section.id" :value="section.slug">{{ section.name }}</option></select></label><label>Заголовок<input v-model="topicForm.title" required></label><label>Текст<textarea v-model="topicForm.body" required/></label><button class="btn btn-primary" type="submit" :disabled="topicBusy">{{ topicBusy ? 'Создаём…' : 'Опубликовать тему' }}</button><p v-if="topicStatus" class="ref-error">{{ topicStatus }}</p></form></section>
      </div>
      <aside class="forum-right"><section><h2>Разделы форума</h2><RouterLink v-for="section in sections" :key="section.id" :to="{ path: '/forum', query: { section: section.slug } }" @click.prevent="selectedSection = section.slug">{{ section.name }}<small>{{ section.description || 'Обсуждения сообщества' }}</small></RouterLink></section><section><h2>О сообществе</h2><p>Форум открыт для читателей и авторов. Соблюдайте уважительный тон и правила площадки.</p></section></aside>
    </section>
  </main>
</template>
