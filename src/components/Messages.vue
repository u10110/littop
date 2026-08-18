<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useMutation, useQuery } from '@vue/apollo-composable';
import { apolloClient } from '../lib/apollo.js';
import { AUTHOR_QUERY, AUTHORS_QUERY, DIRECT_MESSAGES_QUERY, MESSAGES_SIDEBAR_QUERY, MY_CONVERSATIONS_QUERY, SEND_DIRECT_MESSAGE_MUTATION } from '../lib/graphql.js';
import { useSession } from '../lib/session.js';
import { formatDate } from '../lib/format.js';
import { authorAvatarUrl } from '../lib/authorAvatar.js';

const route = useRoute();
const { isAuthenticated, currentUser } = useSession();
const search = ref('');
const authorSearch = ref('');
const selectedPeerId = ref(null);
const requestedPeer = ref(null);
const requestedPeerLoading = ref(false);
const requestedPeerError = ref('');
const draft = ref('');
const sendError = ref('');
const threadBody = ref(null);

const { result: conversationsResult, loading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery(
  MY_CONVERSATIONS_QUERY,
  () => ({ limit: 30 }),
  () => ({ enabled: isAuthenticated.value, fetchPolicy: 'cache-and-network' }),
);
const conversations = computed(() => conversationsResult.value?.myConversations ?? []);
const filteredConversations = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) return conversations.value;
  return conversations.value.filter(({ peer, lastMessageBody }) => [peer.displayName, peer.login, lastMessageBody].some((value) => String(value ?? '').toLowerCase().includes(needle)));
});
const { result: authorsResult, loading: authorsLoading } = useQuery(
  AUTHORS_QUERY,
  () => ({ limit: 8, offset: 0, search: authorSearch.value.trim() || null, classicsOnly: false, featuredOnly: false }),
  () => ({ enabled: isAuthenticated.value && authorSearch.value.trim().length >= 2, fetchPolicy: 'network-only' }),
);
const foundAuthors = computed(() => authorSearch.value.trim().length >= 2
  ? (authorsResult.value?.authors ?? []).filter((author) => String(author.id) !== String(currentUser.value?.id))
  : []);
const { result: sidebarResult, loading: sidebarLoading } = useQuery(
  MESSAGES_SIDEBAR_QUERY,
  null,
  () => ({ enabled: isAuthenticated.value, fetchPolicy: 'cache-and-network' }),
);
const onlineAuthors = computed(() => (sidebarResult.value?.onlineAuthors ?? []).filter((author) => String(author.id) !== String(currentUser.value?.id)));
const recentAuthors = computed(() => (sidebarResult.value?.todayVisitors ?? []).filter((author) => String(author.id) !== String(currentUser.value?.id)));

watch(conversations, (items) => {
  const existing = items.find((item) => String(item.peerUserId) === String(selectedPeerId.value));
  if (existing) requestedPeer.value = null;
  if (!selectedPeerId.value && items[0]) selectedPeerId.value = String(items[0].peerUserId);
}, { immediate: true });

watch(
  () => [route.query.to, isAuthenticated.value, currentUser.value?.id],
  async ([login, authenticated, currentUserId]) => {
    const normalizedLogin = String(login ?? '').trim();
    requestedPeer.value = null;
    requestedPeerError.value = '';
    if (!authenticated || !normalizedLogin) return;
    requestedPeerLoading.value = true;
    try {
      const { data } = await apolloClient.query({ query: AUTHOR_QUERY, variables: { login: normalizedLogin }, fetchPolicy: 'network-only' });
      const peer = data?.author ?? null;
      if (!peer?.id) throw new Error('Автор не найден.');
      if (String(peer.id) === String(currentUserId)) throw new Error('Нельзя написать сообщение самому себе.');
      selectedPeerId.value = String(peer.id);
      requestedPeer.value = peer;
    } catch (error) {
      requestedPeerError.value = error?.message || 'Не удалось открыть диалог с автором.';
      selectedPeerId.value = null;
    } finally {
      requestedPeerLoading.value = false;
    }
  },
  { immediate: true },
);

const selectedConversation = computed(() => conversations.value.find((item) => String(item.peerUserId) === String(selectedPeerId.value)) ?? null);
const selectedPeer = computed(() => selectedConversation.value?.peer ?? requestedPeer.value ?? null);
const { result: messagesResult, loading: messagesLoading, error: messagesError, refetch: refetchMessages } = useQuery(
  DIRECT_MESSAGES_QUERY,
  () => ({ peerUserId: selectedPeerId.value }),
  () => ({ enabled: isAuthenticated.value && Boolean(selectedPeerId.value), fetchPolicy: 'network-only' }),
);
const messages = computed(() => messagesResult.value?.directMessages ?? []);
const { mutate: sendDirectMessage, loading: sending } = useMutation(SEND_DIRECT_MESSAGE_MUTATION);

watch(messages, async () => {
  await nextTick();
  if (threadBody.value) threadBody.value.scrollTop = threadBody.value.scrollHeight;
});

function authorName(author) { return author?.displayName || author?.login || 'Автор'; }
function authorInitial(author) { return authorName(author).trim().slice(0, 1).toUpperCase(); }
function formatMessageTime(value) { return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatConversationTime(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatMessageTime(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
}
function selectConversation(peerUserId) {
  requestedPeer.value = null;
  selectedPeerId.value = String(peerUserId);
}
function startConversation(author) {
  if (!author?.id || String(author.id) === String(currentUser.value?.id)) return;
  authorSearch.value = '';
  requestedPeerError.value = '';
  requestedPeer.value = author;
  selectedPeerId.value = String(author.id);
}

async function submitMessage() {
  const body = draft.value.trim();
  if (!body || !selectedPeerId.value || sending.value) return;
  sendError.value = '';
  try {
    await sendDirectMessage({ peerUserId: selectedPeerId.value, body });
    draft.value = '';
    await Promise.all([refetchMessages(), refetchConversations()]);
  } catch (error) {
    sendError.value = error?.message || 'Не удалось отправить сообщение.';
  }
}
</script>

<template>
  <main class="messages-page">
    <template v-if="!isAuthenticated">
      <section class="catalog-empty"><h1>Личные сообщения</h1><p>Чтобы открыть переписки, войдите в свой аккаунт.</p><RouterLink class="btn btn-primary" to="/personal">Войти в кабинет</RouterLink></section>
    </template>
    <template v-else>
      <section class="messages-head"><div><h1>Личные сообщения</h1><p>Диалоги между авторами и читателями внутри сайта</p></div></section>
      <p v-if="conversationsError" class="message error">Не удалось загрузить диалоги: {{ conversationsError.message }}</p>
      <p v-else-if="requestedPeerError" class="message error">{{ requestedPeerError }}</p>
      <section class="messages-layout">
        <aside class="dialogs-card">
          <div class="card-heading"><h2>Диалоги</h2><span>{{ conversations.length }} {{ conversations.length === 1 ? 'диалог' : 'диалогов' }}</span></div>
          <label class="dialog-search">⌕ <input v-model="search" placeholder="Поиск по диалогам"></label>
          <label class="dialog-search new-dialog-search">＋ <input v-model="authorSearch" placeholder="Новый диалог: имя или логин"></label>
          <p v-if="authorsLoading" class="messages-empty">Ищем авторов…</p>
          <div v-else-if="foundAuthors.length" class="author-start-list">
            <button v-for="author in foundAuthors" :key="author.id" class="author-start-row" type="button" @click="startConversation(author)">
              <img :src="authorAvatarUrl(author)" :alt="authorName(author)">
              <span><b>{{ authorName(author) }}</b><small>@{{ author.login }}</small></span><em>Написать</em>
            </button>
          </div>
          <p v-else-if="authorSearch.trim().length >= 2" class="messages-empty">Автор не найден.</p>
          <p v-if="conversationsLoading && !conversationsResult" class="ref-loading">Загружаем диалоги…</p>
          <div v-else-if="filteredConversations.length" class="dialog-list">
            <button v-for="conversation in filteredConversations" :key="conversation.peerUserId" class="dialog-row" :class="{ selected: String(conversation.peerUserId) === String(selectedPeerId) }" type="button" @click="selectConversation(conversation.peerUserId)">
              <img :src="authorAvatarUrl(conversation.peer)" :alt="authorName(conversation.peer)">
              <span><b>{{ authorName(conversation.peer) }}</b><small>@{{ conversation.peer.login }}</small><em>{{ conversation.lastMessageBody }}</em></span>
              <time>{{ formatConversationTime(conversation.lastMessageAt) }}<i v-if="conversation.unreadCount">{{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}</i></time>
            </button>
          </div>
          <p v-else class="messages-empty">{{ search ? 'Диалоги не найдены.' : 'Сообщений пока нет. Откройте страницу автора, чтобы начать диалог.' }}</p>
        </aside>

        <section class="message-thread" :class="{ 'thread-empty': !selectedPeer }">
          <template v-if="selectedPeer">
            <header class="thread-head"><img :src="authorAvatarUrl(selectedPeer)" :alt="authorName(selectedPeer)"><div><h2>{{ authorName(selectedPeer) }}</h2><small>{{ selectedPeer.isOnline ? 'Сейчас в сети' : `Был(а) на сайте: ${formatDate(selectedPeer.lastSeenAt || selectedPeer.updatedAt)}` }}</small></div><RouterLink :to="`/authors/${selectedPeer.login}`">Страница автора</RouterLink></header>
            <div ref="threadBody" class="thread-body"><p v-if="messagesLoading && !messagesResult" class="ref-loading">Открываем переписку…</p><p v-else-if="messagesError" class="message error">{{ messagesError.message }}</p><p v-else-if="!messages.length" class="messages-empty">Это начало диалога. Напишите первое сообщение.</p><article v-for="message in messages" :key="message.id" class="bubble" :class="String(message.senderUserId) === String(currentUser?.id) ? 'outgoing' : 'incoming'">{{ message.body }}<time>{{ formatMessageTime(message.createdAt) }}<span v-if="String(message.senderUserId) === String(currentUser?.id) && message.readAt"> ✓✓</span></time></article></div>
            <form class="message-compose" @submit.prevent="submitMessage"><input v-model="draft" :disabled="sending" maxlength="5000" placeholder="Напишите сообщение…"><button class="btn btn-primary" type="submit" :disabled="sending || !draft.trim()">{{ sending ? 'Отправляем…' : '➤ Отправить' }}</button></form><p v-if="sendError" class="message error compose-error">{{ sendError }}</p>
          </template>
          <div v-else class="messages-empty thread-placeholder"><h2>Выберите диалог</h2><p>Все личные переписки будут отображаться здесь.</p></div>
        </section>
        <aside class="people-side" aria-label="Авторы на сайте">
          <section>
            <h2>Кто сейчас в сети</h2>
            <p v-if="sidebarLoading && !sidebarResult" class="people-side-empty">Загружаем…</p>
            <div v-for="author in onlineAuthors" :key="author.id" class="people-side-row">
              <RouterLink class="people-profile-link" :to="`/authors/${author.login}`">
                <img :src="authorAvatarUrl(author)" :alt="authorName(author)">
                <span><b>{{ authorName(author) }}</b><small>@{{ author.login }}</small></span><i aria-label="В сети"></i>
              </RouterLink>
              <button class="message-author-icon" type="button" :aria-label="`Написать ${authorName(author)}`" title="Написать сообщение" @click="startConversation(author)">✉</button>
            </div>
            <p v-if="!sidebarLoading && !onlineAuthors.length" class="people-side-empty">Сейчас никто не в сети.</p>
          </section>
          <section>
            <h2>Последние на сайте</h2>
            <div v-for="author in recentAuthors" :key="author.id" class="people-side-row">
              <RouterLink class="people-profile-link" :to="`/authors/${author.login}`">
                <img :src="authorAvatarUrl(author)" :alt="authorName(author)">
                <span><b>{{ authorName(author) }}</b><small>{{ formatDate(author.lastSeenAt || author.updatedAt) }}</small></span>
              </RouterLink>
              <button class="message-author-icon" type="button" :aria-label="`Написать ${authorName(author)}`" title="Написать сообщение" @click="startConversation(author)">✉</button>
            </div>
            <p v-if="!sidebarLoading && !recentAuthors.length" class="people-side-empty">Сегодня ещё никто не заходил.</p>
          </section>
        </aside>
      </section>
    </template>
  </main>
</template>
