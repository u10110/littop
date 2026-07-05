<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import {
  AUTH_MODAL_RESET_MODE,
  SOCIAL_AUTH_CALLBACK_PATH,
  SOCIAL_AUTH_PROVIDERS,
  buildSocialAuthStartUrl,
  getGraphqlEndpoint,
  isValidEmail,
  normalizeEmail,
  parseAuthModalParams,
  parseSocialAuthCallbackParams,
  validatePassword,
} from './lib/auth.js';
import { useSession } from './lib/session.js';
import { apolloClient } from './lib/apollo.js';
import { PRIVATE_DIALOGS_QUERY, SITE_CHROME_QUERY, TOUCH_PRESENCE_MUTATION } from './lib/graphql.js';
import { formatBirthday, formatDateTime } from './lib/format.js';
import { setDocumentTitle } from './lib/pageTitle.js';
import { buildAuthorPageLocation } from './lib/routes.js';

const endpoint = getGraphqlEndpoint();
const route = useRoute();
const router = useRouter();
const authMode = ref('login');
const authSuccess = ref('');
const authLocalError = ref('');
const socialAuthFeedback = ref('');
const isAuthModalOpen = ref(false);
const loginPasswordVisible = ref(false);
const registerPasswordVisible = ref(false);
const resetPasswordVisible = ref(false);
const resetConfirmPasswordVisible = ref(false);
const resetToken = ref('');
const loginForm = ref({
  identifier: '',
  password: '',
});
const registerForm = ref({
  email: '',
  login: '',
  password: '',
  displayName: '',
  acceptTerms: false,
});
const forgotForm = ref({
  email: '',
});
const resetForm = ref({
  password: '',
  confirmPassword: '',
});
const socialProviders = Object.values(SOCIAL_AUTH_PROVIDERS);
const isUserCardOpen = ref(false);
const { result: siteChromeResult } = useQuery(SITE_CHROME_QUERY, null, { fetchPolicy: 'cache-and-network' });

const {
  currentUser,
  isAuthenticated,
  authBusy,
  authError,
  authMeta,
  bootstrapError,
  bootstrapped,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  reopenClosedAccount,
  completeExternalAuthToken,
  hasStoredOwnerSession,
  restoreOwnerSession,
  logout,
  bootstrapSession,
} = useSession();

const displayName = computed(() => currentUser.value?.profile?.displayName || currentUser.value?.login || 'Автор');
const unreadDialogsCount = ref(0);
const visibleAuthError = computed(() => authLocalError.value || authError.value);
const canReopenClosedAccount = computed(() => authMode.value === 'login' && authMeta.value?.code === 'ACCOUNT_REOPEN_AVAILABLE' && String(loginForm.value.identifier || '').trim() && String(loginForm.value.password || '').trim());
const reopenUntilLabel = computed(() => formatDateTime(authMeta.value?.reopenUntil));
const footerOnlineAuthors = computed(() => siteChromeResult.value?.onlineAuthors ?? []);
const footerTodayVisitors = computed(() => siteChromeResult.value?.todayVisitors ?? []);
const footerBirthdayAuthors = computed(() => siteChromeResult.value?.birthdayAuthors ?? []);
const footerPresenceSections = computed(() => ([
  { key: 'online', title: 'Кто сейчас находится в сети', items: footerOnlineAuthors.value, meta: (author) => author?.isOnline ? 'онлайн' : '' },
  { key: 'today', title: 'Кто сегодня заходил на сайт', items: footerTodayVisitors.value, meta: (author) => author?.lastSeenAt ? formatDateTime(author.lastSeenAt) : '' },
  { key: 'birthday', title: 'У кого день рождения', items: footerBirthdayAuthors.value, meta: (author) => author?.birthDate ? formatBirthday(author.birthDate) : '' },
]).filter((section) => section.items.length));
const authModalTitle = computed(() => ({
  login: 'Авторизация',
  register: 'Регистрация',
  forgot: 'Восстановление пароля',
  reset: 'Новый пароль',
}[authMode.value] || 'Авторизация'));
const authModalSubtitle = computed(() => ({
  login: 'Войди в аккаунт по почте.',
  register: 'Создай профиль по email и сразу попади в personal.',
  forgot: 'Укажи почту — на неё придёт ссылка на форму смены пароля.',
  reset: 'Введи новый пароль дважды.',
}[authMode.value] || 'Войди в аккаунт по почте.'));

let successTimer = null;
let presenceTimer = null;
let lastHandledSocialCallback = '';

function clearSuccessTimer() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
}

function clearPresenceTimer() {
  if (presenceTimer) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
}


async function refreshPrivateDialogsBadge() {
  if (!isAuthenticated.value) {
    unreadDialogsCount.value = 0;
    return;
  }
  try {
    const { data } = await apolloClient.query({
      query: PRIVATE_DIALOGS_QUERY,
      variables: { limit: 100 },
      fetchPolicy: 'network-only',
    });
    unreadDialogsCount.value = (data?.privateDialogs ?? []).reduce((sum, item) => sum + Number(item.unreadCount ?? 0), 0);
  } catch {
    unreadDialogsCount.value = 0;
  }
}

function clearAuthLocalError() {
  authLocalError.value = '';
}

function resetAuthForms() {
  loginForm.value = { identifier: '', password: '' };
  registerForm.value = { email: '', login: '', password: '', displayName: '', acceptTerms: false };
  forgotForm.value = { email: '' };
  resetForm.value = { password: '', confirmPassword: '' };
  loginPasswordVisible.value = false;
  registerPasswordVisible.value = false;
  resetPasswordVisible.value = false;
  resetConfirmPasswordVisible.value = false;
}

async function touchPresence() {
  if (!isAuthenticated.value) return;
  try {
    await apolloClient.mutate({
      mutation: TOUCH_PRESENCE_MUTATION,
      fetchPolicy: 'no-cache',
    });
  } catch {
    // Молча пропускаем: presence не должен ломать UI.
  }
}

function startPresenceHeartbeat() {
  clearPresenceTimer();
  if (!isAuthenticated.value) return;
  void touchPresence();
  presenceTimer = setInterval(() => {
    void touchPresence();
  }, 60_000);
}

function setSuccessMessage(message) {
  clearSuccessTimer();
  authSuccess.value = message;
  if (message) {
    successTimer = setTimeout(() => {
      authSuccess.value = '';
      successTimer = null;
    }, 4000);
  }
}

function openAuthModal(mode = 'login', { token = '' } = {}) {
  authMode.value = mode;
  isUserCardOpen.value = false;
  resetToken.value = mode === 'reset' ? token.trim() : '';
  clearAuthLocalError();
  isAuthModalOpen.value = true;
}

async function clearResetRouteState() {
  if (!route.query?.auth && !route.query?.token) {
    return;
  }

  const nextQuery = { ...route.query };
  delete nextQuery.auth;
  delete nextQuery.token;
  await router.replace({
    path: route.path,
    query: nextQuery,
    hash: route.hash,
  });
}

function closeAuthModal() {
  isAuthModalOpen.value = false;
  isUserCardOpen.value = false;
  clearAuthLocalError();
  loginPasswordVisible.value = false;
  registerPasswordVisible.value = false;
  resetPasswordVisible.value = false;
  resetConfirmPasswordVisible.value = false;
  if (route.query?.auth || route.query?.token) {
    void clearResetRouteState();
  }
}

function handleOpenAuthEvent(event) {
  openAuthModal(event?.detail?.mode === 'register' ? 'register' : 'login');
}

function providerLabel(providerCode) {
  return SOCIAL_AUTH_PROVIDERS[providerCode]?.label || 'соцсеть';
}

function toggleUserCard() {
  isUserCardOpen.value = !isUserCardOpen.value;
}

function resolveRedirectTarget(rawValue) {
  const fallback = '/personal';
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback;
  }

  try {
    const url = new URL(rawValue, window.location.origin);
    if (url.origin !== window.location.origin) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

function startSocialAuth(provider, mode = 'login') {
  socialAuthFeedback.value = '';
  const authUrl = buildSocialAuthStartUrl(provider, {
    mode,
    graphqlEndpoint: endpoint,
    currentOrigin: window.location.origin,
    redirectTo: '/personal',
  });
  window.location.assign(authUrl);
}

function validateEmailOrShow(value) {
  const email = normalizeEmail(value);
  if (!isValidEmail(email)) {
    authLocalError.value = 'Введите корректный email.';
    return '';
  }
  return email;
}

function validatePasswordOrShow(value) {
  const error = validatePassword(value);
  if (error) {
    authLocalError.value = error;
    return '';
  }
  return String(value ?? '');
}

async function handleSocialAuthCallback() {
  if (route.path !== SOCIAL_AUTH_CALLBACK_PATH) {
    return;
  }

  const callbackSignature = window.location.search;
  if (callbackSignature === lastHandledSocialCallback) {
    return;
  }
  lastHandledSocialCallback = callbackSignature;

  const { token, error, provider, mode, redirectTo } = parseSocialAuthCallbackParams(window.location.search);
  const targetPath = resolveRedirectTarget(redirectTo);

  if (error) {
    socialAuthFeedback.value = `Не удалось завершить вход через ${providerLabel(provider)}.`;
    await router.replace(targetPath);
    return;
  }

  if (!token) {
    socialAuthFeedback.value = 'Соцсеть не вернула токен авторизации.';
    await router.replace(targetPath);
    return;
  }

  try {
    await completeExternalAuthToken(token);
    socialAuthFeedback.value = '';
    setSuccessMessage(
      mode === 'register'
        ? `Профиль через ${providerLabel(provider)} создан и активирован.`
        : `Вход через ${providerLabel(provider)} выполнен.`,
    );
  } catch {
    socialAuthFeedback.value = `Не удалось завершить вход через ${providerLabel(provider)}.`;
  } finally {
    await router.replace(targetPath);
  }
}

function handleAuthRouteState() {
  if (route.path === SOCIAL_AUTH_CALLBACK_PATH) {
    return;
  }

  const { mode, token } = parseAuthModalParams(window.location.search);
  if (mode === AUTH_MODAL_RESET_MODE && token) {
    openAuthModal('reset', { token });
  }
}

onMounted(async () => {
  await bootstrapSession();
  await refreshPrivateDialogsBadge();
  window.addEventListener('littop:open-auth', handleOpenAuthEvent);
});

onBeforeUnmount(() => {
  clearSuccessTimer();
  clearPresenceTimer();
  window.removeEventListener('littop:open-auth', handleOpenAuthEvent);
  document.body.style.overflow = '';
});

watch(isAuthModalOpen, (value) => {
  document.body.style.overflow = value ? 'hidden' : '';
});

watch(
  [() => route.name, bootstrapped, isAuthenticated],
  ([name, isBootstrapped, authed]) => {
    if (name === 'personal' && isBootstrapped && !authed) {
      openAuthModal('login');
    }
  },
  { immediate: true },
);

watch(isAuthenticated, async (value) => {
  if (value && isAuthModalOpen.value) {
    closeAuthModal();
  }
  if (value) {
    startPresenceHeartbeat();
  } else {
    clearPresenceTimer();
  }
  await refreshPrivateDialogsBadge();
}, { immediate: true });

watch(
  () => route.fullPath,
  async () => {
    isUserCardOpen.value = false;
    await refreshPrivateDialogsBadge();
    void handleSocialAuthCallback();
    handleAuthRouteState();
  },
  { immediate: true },
);

watch(
  () => route.meta?.title,
  (title) => {
    setDocumentTitle(typeof title === 'string' ? title : 'Литопотам');
  },
  { immediate: true },
);

async function submitLogin() {
  clearAuthLocalError();
  const identifier = String(loginForm.value.identifier || '').trim();
  if (!identifier) {
    authLocalError.value = 'Введите email или логин.';
    return;
  }
  if (!loginForm.value.password) {
    authLocalError.value = 'Введите пароль.';
    return;
  }

  try {
    await login({
      identifier,
      password: loginForm.value.password,
    });
    loginForm.value = { identifier: '', password: '' };
    loginPasswordVisible.value = false;
    setSuccessMessage('Вход выполнен. Модальное окно закрыто.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitReopenClosedAccount() {
  clearAuthLocalError();
  const identifier = String(loginForm.value.identifier || '').trim();
  if (!identifier || !loginForm.value.password) {
    authLocalError.value = 'Сначала введи логин/email и пароль.';
    return;
  }

  try {
    await reopenClosedAccount({
      identifier,
      password: loginForm.value.password,
    });
    loginForm.value = { identifier: '', password: '' };
    loginPasswordVisible.value = false;
    setSuccessMessage('Аккаунт снова открыт. Вы вошли автоматически.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError/session.
  }
}

async function submitRegister() {
  clearAuthLocalError();
  const displayNameValue = String(registerForm.value.displayName || '').trim();
  if (!displayNameValue) {
    authLocalError.value = 'Введите отображаемое имя.';
    return;
  }

  const loginValue = String(registerForm.value.login || '').trim();
  if (!loginValue) {
    authLocalError.value = 'Введите логин.';
    return;
  }

  const email = validateEmailOrShow(registerForm.value.email);
  if (!email) return;

  const password = validatePasswordOrShow(registerForm.value.password);
  if (!password) return;

  if (!registerForm.value.acceptTerms) {
    authLocalError.value = 'Нужно принять Пользовательское соглашение.';
    return;
  }

  try {
    await register({
      email,
      login: loginValue,
      password,
      displayName: displayNameValue,
      acceptTerms: true,
    });
    registerForm.value = { email: '', login: '', password: '', displayName: '', acceptTerms: false };
    registerPasswordVisible.value = false;
    setSuccessMessage('Профиль создан. Модальное окно закрыто.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitForgotPassword() {
  clearAuthLocalError();
  const email = validateEmailOrShow(forgotForm.value.email);
  if (!email) return;

  try {
    await requestPasswordReset(email);
    forgotForm.value = { email: '' };
    authMode.value = 'login';
    setSuccessMessage('Письмо со ссылкой для восстановления отправлено.');
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitResetPassword() {
  clearAuthLocalError();
  if (!resetToken.value) {
    authLocalError.value = 'Ссылка восстановления повреждена.';
    return;
  }

  const password = validatePasswordOrShow(resetForm.value.password);
  if (!password) return;
  if (password !== resetForm.value.confirmPassword) {
    authLocalError.value = 'Пароли не совпадают.';
    return;
  }

  try {
    await resetPassword({
      token: resetToken.value,
      password,
    });
    resetForm.value = { password: '', confirmPassword: '' };
    await clearResetRouteState();
    setSuccessMessage('Пароль обновлён. Вы вошли в аккаунт.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitLogout() {
  isUserCardOpen.value = false;
  await logout();
  unreadDialogsCount.value = 0;
  setSuccessMessage('Сессия завершена.');
}

async function submitRestoreOwner() {
  isUserCardOpen.value = false;
  await restoreOwnerSession();
  await refreshPrivateDialogsBadge();
  setSuccessMessage('Возврат в аккаунт владельца выполнен.');
}
</script>

<template>
  <header>
    <div class="navwrap">
      <div class="logo-block">
        <div class="logo"><a href="https://littop.ru/"> Литопотам </a></div>
      </div>

      <nav class="nav" aria-label="Главное меню">
        <RouterLink to="/">Главная</RouterLink>
        <RouterLink to="/works">Произведения</RouterLink>
        <RouterLink to="/authors">Авторы</RouterLink>
        <RouterLink to="/contests">Конкурсы</RouterLink>
        <RouterLink to="/radio">Радио</RouterLink>
        <RouterLink to="/forum">Форум</RouterLink>
        <RouterLink v-if="isAuthenticated" to="/personal">Мой кабинет</RouterLink>
        <RouterLink v-if="isAuthenticated" class="bell-btn" :class="unreadDialogsCount ? 'bell-btn-hot' : 'bell-btn-calm'" to="/messages" aria-label="Личные сообщения">
          <span class="bell-icon">🔔</span>
        </RouterLink>
      </nav>

      <div class="actions">
        <div v-if="isAuthenticated" class="user-menu-wrap">
          <button class="btn btn-outline user-menu-trigger" type="button" @click="toggleUserCard">👤 {{ displayName }}</button>
          <div v-if="isUserCardOpen" class="auth-box user-card user-card-popup">
            <div class="stack">
              <div class="section-head">
                <RouterLink v-if="currentUser?.login" class="nav-author-link" :to="buildAuthorPageLocation(currentUser.login)">{{ displayName }}</RouterLink>
                <strong v-else>{{ displayName }}</strong>
                <span class="pill good">онлайн</span>
              </div>
              <div class="meta">@{{ currentUser?.login }} · {{ currentUser?.email }}</div>
              <div class="meta">Роль: {{ currentUser?.role }} · статус: {{ currentUser?.status }}</div>
            </div>
            <div class="inline-actions wrap-actions">
              <RouterLink class="btn btn-outline bell-btn" :class="unreadDialogsCount ? 'bell-btn-hot' : 'bell-btn-calm'" to="/messages">
                <span class="bell-icon">🔔</span>
                <span>{{ unreadDialogsCount ? `Новых: ${unreadDialogsCount}` : 'Сообщения' }}</span>
              </RouterLink>
              <RouterLink class="btn btn-outline" to="/personal">Мой кабинет</RouterLink>
              <button v-if="hasStoredOwnerSession" class="btn btn-outline" type="button" @click="submitRestoreOwner">Вернуться во владельца</button>
              <button class="btn btn-outline" type="button" @click="submitLogout">Выйти</button>
            </div>
          </div>
        </div>

        <div v-else class="actions-compact">
          <button class="btn btn-primary" type="button" @click="openAuthModal('login')">Войти</button>
          <button class="btn btn-outline" type="button" @click="openAuthModal('register')">Регистрация</button>
        </div>
      </div>
    </div>
  </header>

  <Transition name="fade-modal">
    <div v-if="isAuthModalOpen" class="modal-backdrop" @click.self="closeAuthModal">
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="section-head">
          <div class="stack compact-stack">
            <h2 id="auth-modal-title">{{ authModalTitle }}</h2>
            <span class="meta">{{ authModalSubtitle }}</span>
          </div>
          <button class="btn btn-ghost modal-close" type="button" @click="closeAuthModal" aria-label="Закрыть">×</button>
        </div>

        <div v-if="authMode === 'login' || authMode === 'register'" class="auth-toggle">
          <button
            class="btn"
            :class="authMode === 'login' ? 'btn-primary' : 'btn-outline'"
            type="button"
            @click="openAuthModal('login')"
          >
            Вход
          </button>
          <button
            class="btn"
            :class="authMode === 'register' ? 'btn-primary' : 'btn-outline'"
            type="button"
            @click="openAuthModal('register')"
          >
            Регистрация
          </button>
        </div>

        <div v-else class="inline-actions">
          <button class="btn btn-outline" type="button" @click="openAuthModal('login')">Назад ко входу</button>
          <button v-if="authMode !== 'register'" class="btn btn-outline" type="button" @click="openAuthModal('register')">Регистрация</button>
        </div>

        <div v-if="visibleAuthError" class="message error">{{ visibleAuthError }}</div>

        <form v-if="authMode === 'login'" class="auth-grid" @submit.prevent="submitLogin">
          <div class="field">
            <label for="login-identifier">Email или логин</label>
            <input id="login-identifier" v-model="loginForm.identifier" class="input" autocomplete="username email" required />
          </div>
          <div class="field">
            <label for="login-password">Пароль</label>
            <div class="password-input-row">
              <input
                id="login-password"
                v-model="loginForm.password"
                class="input"
                :type="loginPasswordVisible ? 'text' : 'password'"
                autocomplete="current-password"
                required
              />
              <button
                class="btn btn-outline password-toggle"
                type="button"
                :aria-pressed="loginPasswordVisible"
                :aria-label="loginPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
                @click="loginPasswordVisible = !loginPasswordVisible"
              >
                {{ loginPasswordVisible ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="submit" :disabled="authBusy">{{ authBusy ? 'Входим…' : 'Войти' }}</button>
            <button class="btn btn-ghost" type="button" @click="openAuthModal('forgot')">Забыли пароль?</button>
          </div>
          <div v-if="canReopenClosedAccount" class="message warn">
            <div>Аккаунт закрыт, но его ещё можно открыть{{ reopenUntilLabel && reopenUntilLabel !== '—' ? ` до ${reopenUntilLabel}` : '' }}.</div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="button" :disabled="authBusy" @click="submitReopenClosedAccount">Открыть аккаунт</button>
            </div>
          </div>
          <div class="social-auth-block">
            <div class="meta">Или войди через соцсеть</div>
            <div class="social-auth-grid">
              <button
                v-for="provider in socialProviders"
                :key="`login-${provider.code}`"
                class="btn btn-outline btn-social"
                type="button"
                @click="startSocialAuth(provider.code, 'login')"
              >
                {{ provider.label }}
              </button>
            </div>
          </div>
        </form>

        <form v-else-if="authMode === 'register'" class="auth-grid" @submit.prevent="submitRegister">
          <div class="field">
            <label for="register-display-name">Отображаемое имя</label>
            <input id="register-display-name" v-model="registerForm.displayName" class="input" autocomplete="name" required />
          </div>
          <div class="field">
            <label for="register-login">Логин</label>
            <input id="register-login" v-model="registerForm.login" class="input" autocomplete="username" required />
          </div>
          <div class="field">
            <label for="register-email">Email</label>
            <input id="register-email" v-model="registerForm.email" class="input" type="email" inputmode="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="register-password">Пароль</label>
            <div class="password-input-row">
              <input
                id="register-password"
                v-model="registerForm.password"
                class="input"
                :type="registerPasswordVisible ? 'text' : 'password'"
                autocomplete="new-password"
                required
              />
              <button
                class="btn btn-outline password-toggle"
                type="button"
                :aria-pressed="registerPasswordVisible"
                :aria-label="registerPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
                @click="registerPasswordVisible = !registerPasswordVisible"
              >
                {{ registerPasswordVisible ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <label class="terms-check">
            <input v-model="registerForm.acceptTerms" type="checkbox" required />
            <span>
              Я принимаю
              <RouterLink class="terms-link" to="/terms" target="_blank">Пользовательское соглашение</RouterLink>
            </span>
          </label>
          <button class="btn btn-primary" type="submit" :disabled="authBusy">
            {{ authBusy ? 'Создаём профиль…' : 'Создать профиль' }}
          </button>
          <div class="social-auth-block">
            <div class="meta">Или зарегистрируйся через соцсеть</div>
            <div class="social-auth-grid">
              <button
                v-for="provider in socialProviders"
                :key="`register-${provider.code}`"
                class="btn btn-outline btn-social"
                type="button"
                @click="startSocialAuth(provider.code, 'register')"
              >
                {{ provider.label }}
              </button>
            </div>
          </div>
        </form>

        <form v-else-if="authMode === 'forgot'" class="auth-grid" @submit.prevent="submitForgotPassword">
          <div class="field">
            <label for="forgot-email">Почта для восстановления</label>
            <input id="forgot-email" v-model="forgotForm.email" class="input" type="email" inputmode="email" autocomplete="email" required />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="authBusy">
            {{ authBusy ? 'Отправляем…' : 'Отправить письмо' }}
          </button>
        </form>

        <form v-else class="auth-grid" @submit.prevent="submitResetPassword">
          <div class="field">
            <label for="reset-password">Новый пароль</label>
            <div class="password-input-row">
              <input id="reset-password" v-model="resetForm.password" class="input" :type="resetPasswordVisible ? 'text' : 'password'" autocomplete="new-password" required />
              <button class="btn btn-outline password-toggle" type="button" :aria-pressed="resetPasswordVisible" :aria-label="resetPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'" @click="resetPasswordVisible = !resetPasswordVisible">
                {{ resetPasswordVisible ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <div class="field">
            <label for="reset-password-confirm">Повтори пароль</label>
            <div class="password-input-row">
              <input id="reset-password-confirm" v-model="resetForm.confirmPassword" class="input" :type="resetConfirmPasswordVisible ? 'text' : 'password'" autocomplete="new-password" required />
              <button class="btn btn-outline password-toggle" type="button" :aria-pressed="resetConfirmPasswordVisible" :aria-label="resetConfirmPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'" @click="resetConfirmPasswordVisible = !resetConfirmPasswordVisible">
                {{ resetConfirmPasswordVisible ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <button class="btn btn-primary" type="submit" :disabled="authBusy">
            {{ authBusy ? 'Сохраняем…' : 'Сохранить новый пароль' }}
          </button>
        </form>
      </div>
    </div>
  </Transition>

  <main>
    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>
    <div v-if="bootstrapError" class="message error">{{ bootstrapError }}</div>
    <div v-if="socialAuthFeedback" class="message error">{{ socialAuthFeedback }}</div>
    <div v-if="authSuccess" class="message success">{{ authSuccess }}</div>

    <RouterView />

    <footer class="footer footer-extended">
      <div v-if="footerPresenceSections.length" class="footer-presence-grid">
        <article v-for="section in footerPresenceSections" :key="section.key" class="footer-presence-card">
          <h3>{{ section.title }}</h3>
          <div class="stack">
            <RouterLink
              v-for="author in section.items"
              :key="`${section.key}-${author.id}`"
              class="footer-presence-link"
              :to="buildAuthorPageLocation(author)"
            >
              <strong>{{ author.displayName || author.login }}</strong>
              <span class="meta">@{{ author.login }}<template v-if="section.meta(author)"> · {{ section.meta(author) }}</template></span>
            </RouterLink>
          </div>
        </article>
      </div>
      <div class="meta" align="right">littop 2026 &copy;</div>
    </footer>
  </main>
</template>
