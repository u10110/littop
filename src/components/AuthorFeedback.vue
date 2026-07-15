<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_QUERY, AUTHOR_DETAILS_QUERY } from '../lib/graphql.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { formatDateTime, excerptText } from '../lib/format.js';

const route = useRoute();
const login = computed(() => route.params.login);
// kind = 'received' -> отзывы, написанные АВТОРУ под его произведениями (НАПИСАННЫЕ)
// kind = 'written'  -> что АВТОР написал другим (ПОЛУЧЕННЫЕ)
const kind = computed(() => route.params.kind);

const author = ref(null);
const loading = ref(false);
const errorMsg = ref('');
const writtenReviews = ref([]);
const receivedReviews = ref([]);

const isWritten = computed(() => kind.value === 'written');

const title = computed(() =>
  isWritten.value
    ? 'Полученные — что автор написал другим'
    : 'Написанные — отзывы, написанные автору',
);
const eyebrow = computed(() =>
  isWritten.value
    ? 'Отзывы и сообщения, которые этот автор написал другим авторам'
    : 'Отзывы и сообщения, написанные автору под его произведениями',
);

const items = computed(() =>
  isWritten.value ? writtenReviews.value : receivedReviews.value,
);

function mapRow(item) {
  const counterpart = isWritten.value ? item.workAuthor : item.commentAuthor;
  const counterpartName =
    counterpart?.displayName ||
    counterpart?.login ||
    (isWritten.value ? 'автору произведения' : 'автор');
  const counterpartLink = counterpart?.login
    ? buildAuthorPageLocation(counterpart)
    : null;
  return {
    id: item.id,
    workId: item.workId,
    workSlug: item.workSlug,
    workTitle: item.workTitle,
    body: item.body,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    counterpartName,
    counterpartLink,
    relation: isWritten.value ? 'Кому' : 'От',
  };
}
const rows = computed(() => items.value.map(mapRow));

async function load() {
  loading.value = true;
  errorMsg.value = '';
  author.value = null;
  writtenReviews.value = [];
  receivedReviews.value = [];
  const l = login.value;
  if (!l) {
    errorMsg.value = 'Не указан автор.';
    loading.value = false;
    return;
  }
  try {
    const { data } = await apolloClient.query({
      query: AUTHOR_QUERY,
      variables: { login: l },
      fetchPolicy: 'network-only',
    });
    author.value = data?.author ?? null;
    if (author.value?.id) {
      const { data: d } = await apolloClient.query({
        query: AUTHOR_DETAILS_QUERY,
        variables: { login: l, authorId: author.value.id },
        fetchPolicy: 'network-only',
      });
      writtenReviews.value = d?.writtenReviews ?? [];
      receivedReviews.value = d?.receivedReviews ?? [];
    }
  } catch (e) {
    errorMsg.value = e?.message || 'Не удалось загрузить данные.';
  } finally {
    loading.value = false;
  }
}

function backLink() {
  return author.value ? buildAuthorPageLocation(author.value) : '/authors';
}

onMounted(load);
watch([login, kind], load);
</script>

<template>
  <main>
    <section class="panel stack author-feedback">
      <RouterLink class="btn btn-outline" :to="backLink()">← К странице автора</RouterLink>
      <div class="section-head">
        <div>
          <div class="author-paper-eyebrow">{{ eyebrow }}</div>
          <h1 class="author-paper-title">{{ title }}</h1>
          <div v-if="author" class="author-feedback-sub">
            Автор: {{ author.displayName }} [{{ author.login }}]
          </div>
        </div>
        <span class="author-counter">{{ loading ? 'загрузка…' : `${rows.length} записей` }}</span>
      </div>

      <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
      <div v-else-if="loading" class="message">Загрузка…</div>
      <ol v-else-if="rows.length" class="author-works-ledger">
        <li v-for="row in rows" :key="row.id" >
          <div class="author-work-body">
            <RouterLink
              class="author-work-title"
              :to="buildWorkPageLocation({ id: row.workId, slug: row.workSlug })"
            >{{ row.workTitle }}</RouterLink>
            <div class="author-work-meta">
              <template v-if="row.counterpartLink">
                {{ row.relation }}: <RouterLink :to="row.counterpartLink">{{ row.counterpartName }}</RouterLink>
              </template>
              <template v-else>{{ row.counterpartName }}</template>
              <span v-if="row.counterpartLink"> · {{ formatDateTime(row.updatedAt || row.createdAt) }}</span>
            </div>
            <div class="author-work-excerpt">{{ excerptText(row.body, 260) }}</div>
          </div>
        </li>
      </ol>
      <div v-else class="empty-state">
        <template v-if="isWritten">Автор пока не написал отзывов другим авторам.</template>
        <template v-else>Этому автору пока никто не написал отзывов.</template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.author-feedback {
  max-width: 880px;
  margin: 1rem auto;
}
.author-feedback-sub {
  color: var(--muted, #666);
  margin-top: 0.25rem;
  font-size: 0.9rem;
}
</style>
