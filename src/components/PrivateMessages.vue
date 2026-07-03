<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { apolloClient } from '../lib/apollo.js';
import {
  MARK_PRIVATE_MESSAGES_READ_MUTATION,
  PRIVATE_DIALOGS_QUERY,
  PRIVATE_MESSAGES_QUERY,
  SEND_PRIVATE_MESSAGE_MUTATION,
} from '../lib/graphql.js';
import { formatDateTime } from '../lib/format.js';
import { buildAuthorPageLocation, normalizeRouteParam } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();
const { bootstrapSession, currentUser, isAuthenticated } = useSession();

const dialogs = ref([]);
const messages = ref([]);
const pageLoading = ref(false);
const messagesLoading = ref(false);
const pageError = ref('');
const messagesError = ref('');
const sendBusy = ref(false);
const sendStatus = ref('');
const draftRecipientLogin = ref('');
const draftMessageBody = ref('');

const selectedLogin = computed(() => normalizeRouteParam(route.query.with));
const selectedDialog = computed(() => dialogs.value.find((item) => item.peer?.login === selectedLogin.value) ?? null);

onMounted(() => {
  bootstrapSession();
});

watch(isAuthenticated, (value) => {
  if (value) {
    void loadDialogs();
    if (login && isAuthenticated.value) {
      void loadMessages(login);
    }
  } else {
    dialogs.value = [];
    messages.value = [];
  }
}, { immediate: true });

watch(selectedLogin, async (login) => {
  draftRecipientLogin.value = login || draftRecipientLogin.value;
  if (login && isAuthenticated.value) {
    await loadMessages(login);
    await markAsRead(login);
    await loadDialogs();
  }
}, { immediate: true });

async function loadDialogs() {
  if (!isAuthenticated.value) return;
  pageLoading.value = true;
  pageError.value = '';
  try {
    const { data } = await apolloClient.query({
      query: PRIVATE_DIALOGS_QUERY,
      variables: { limit: 100 },
      fetchPolicy: 'network-only',
    });
    dialogs.value = data?.privateDialogs ?? [];
    if (!selectedLogin.value && dialogs.value[0]?.peer?.login) {
      await router.replace({ query: { ...route.query, with: dialogs.value[0].peer.login } });
    }
  } catch (error) {
    pageError.value = error.message;
  } finally {
    pageLoading.value = false;
  }
}

async function loadMessages(login) {
  if (!isAuthenticated.value || !login) return;
  messagesLoading.value = true;
  messagesError.value = '';
  try {
    const { data } = await apolloClient.query({
      query: PRIVATE_MESSAGES_QUERY,
      variables: { withLogin: login, limit: 200 },
      fetchPolicy: 'network-only',
    });
    messages.value = data?.privateMessages ?? [];
  } catch (error) {
    messagesError.value = error.message;
  } finally {
    messagesLoading.value = false;
  }
}

async function markAsRead(login) {
  if (!login) return;
  try {
    await apolloClient.mutate({
      mutation: MARK_PRIVATE_MESSAGES_READ_MUTATION,
      variables: { withLogin: login },
    });
  } catch {
    // Не мешаем чтению диалога, если read-marker не сработал.
  }
}

async function openDialog(login) {
  await router.replace({ query: { ...route.query, with: login } });
}

async function submitMessage() {
  const recipientLogin = (selectedLogin.value || draftRecipientLogin.value || '').trim();
  const body = String(draftMessageBody.value || '').trim();
  if (!recipientLogin || !body) {
    sendStatus.value = 'Укажи логин получателя и текст сообщения.';
    return;
  }

  sendBusy.value = true;
  sendStatus.value = '';
  try {
    const { data } = await apolloClient.mutate({
      mutation: SEND_PRIVATE_MESSAGE_MUTATION,
      variables: {
        recipientLogin,
        body,
      },
    });
    const message = data?.sendPrivateMessage ?? null;
    draftMessageBody.value = '';
    const targetLogin = message?.recipient?.login === currentUser.value?.login
      ? message?.sender?.login
      : message?.recipient?.login || recipientLogin;
    if (targetLogin && targetLogin !== selectedLogin.value) {
      await router.replace({ query: { ...route.query, with: targetLogin } });
    }
    await Promise.all([loadDialogs(), loadMessages(targetLogin || recipientLogin)]);
    sendStatus.value = 'Личное сообщение отправлено.';
  } catch (error) {
    sendStatus.value = error.message;
  } finally {
    sendBusy.value = false;
  }
}

function isOwnMessage(message) {
  return String(message?.senderUserId || '') === String(currentUser.value?.id || '');
}

function openAuthModal(mode = 'login') {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } }));
}
</script>

<template>
  <section class="page-head">
    <div class="section-head">
      <div>
        <h1>Личные сообщения</h1>
        <p class="muted">Диалоги между авторами и читателями внутри сайта.</p>
      </div>
      <RouterLink class="btn btn-outline" to="/authors">Найти собеседника</RouterLink>
    </div>
  </section>

  <div v-if="!isAuthenticated" class="panel stack personal-guest-panel">
    <h2>Нужен вход</h2>
    <p class="muted">Чтобы отправлять и получать личные сообщения, войди в аккаунт.</p>
    <div class="inline-actions">
      <button class="btn btn-primary" type="button" @click="openAuthModal('login')">Войти</button>
      <button class="btn btn-outline" type="button" @click="openAuthModal('register')">Регистрация</button>
    </div>
  </div>

  <section v-else class="layout-columns forum-layout-columns">
    <article class="panel stack">
      <div class="section-head">
        <h2>Диалоги</h2>
        <span class="pill">{{ pageLoading ? 'загрузка…' : `${dialogs.length} диалогов` }}</span>
      </div>
      <div v-if="pageError" class="message error">{{ pageError }}</div>
      <div v-if="dialogs.length" class="stack">
        <button
          v-for="dialog in dialogs"
          :key="dialog.peerUserId"
          class="card clickable text-left"
          :class="{ 'is-selected': dialog.peer?.login === selectedLogin }"
          type="button"
          @click="openDialog(dialog.peer?.login)"
        >
          <div class="section-head">
            <strong>{{ dialog.peer?.displayName || dialog.peer?.login }}</strong>
            <span v-if="dialog.unreadCount" class="pill warn">{{ dialog.unreadCount }} новых</span>
          </div>
          <div class="meta">@{{ dialog.peer?.login }} · {{ formatDateTime(dialog.lastMessageAt) }}</div>
          <div>{{ dialog.lastMessageBody }}</div>
        </button>
      </div>
      <div v-else class="empty-state">Пока нет ни одного диалога.</div>
    </article>

    <article class="panel stack">
      <div class="section-head">
        <h2>{{ selectedDialog?.peer?.displayName || 'Новый диалог' }}</h2>
        <RouterLink
          v-if="selectedDialog?.peer?.login"
          class="btn btn-outline"
          :to="buildAuthorPageLocation(selectedDialog.peer)"
        >
          Страница автора
        </RouterLink>
      </div>

      <div class="field">
        <label for="pm-recipient">Получатель</label>
        <input
          id="pm-recipient"
          v-model="draftRecipientLogin"
          class="input"
          :disabled="Boolean(selectedLogin)"
          placeholder="login автора"
        />
      </div>

      <div v-if="messagesError" class="message error">{{ messagesError }}</div>
      <div v-if="messagesLoading" class="empty-state">Загружаем переписку…</div>

      <div v-else-if="messages.length" class="stack">
        <article
          v-for="message in messages"
          :key="message.id"
          class="card"
          :class="isOwnMessage(message) ? 'pm-message pm-message-own' : 'pm-message'"
        >
          <div class="meta">
            {{ isOwnMessage(message) ? 'Ты' : (message.sender?.displayName || message.sender?.login) }} · {{ formatDateTime(message.createdAt) }}
          </div>
          <div class="prewrap">{{ message.body }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Сообщений пока нет — можно начать разговор первой.</div>

      <form class="stack" @submit.prevent="submitMessage">
        <div class="field">
          <label for="pm-body">Сообщение</label>
          <textarea id="pm-body" v-model="draftMessageBody" class="textarea" placeholder="Напиши сообщение" required />
        </div>
        <div class="inline-actions">
          <button class="btn btn-primary" type="submit" :disabled="sendBusy">{{ sendBusy ? 'Отправляем…' : 'Отправить' }}</button>
          <RouterLink class="btn btn-outline" to="/authors">Открыть список авторов</RouterLink>
        </div>
        <div v-if="sendStatus" class="message" :class="sendStatus.includes('отправлено') ? 'success' : 'error'">{{ sendStatus }}</div>
      </form>
    </article>
  </section>
</template>
