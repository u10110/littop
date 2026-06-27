<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { TOUCH_PRESENCE_MUTATION } from './lib/graphql.js';
import { setDocumentTitle } from './lib/pageTitle.js';

const endpoint = getGraphqlEndpoint();
const route = useRoute();
const router = useRouter();
const authMode = ref('login');
const authSuccess = ref('');
const authLocalError = ref('');
const socialAuthFeedback = ref('');
const isAuthModalOpen = ref(false);
const resetToken = ref('');
const loginForm = ref({
  email: '',
  password: '',
});
const registerForm = ref({
  email: '',
  password: '',
  displayName: '',
});
const forgotForm = ref({
  email: '',
});
const resetForm = ref({
  password: '',
  confirmPassword: '',
});
const socialProviders = Object.values(SOCIAL_AUTH_PROVIDERS);

const {
  currentUser,
  isAuthenticated,
  authBusy,
  authError,
  bootstrapError,
  bootstrapped,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  completeExternalAuthToken,
  logout,
  bootstrapSession,
} = useSession();

const displayName = computed(() => currentUser.value?.profile?.displayName || currentUser.value?.login || 'Автор');
const visibleAuthError = computed(() => authLocalError.value || authError.value);
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

function clearAuthLocalError() {
  authLocalError.value = '';
}

function resetAuthForms() {
  loginForm.value = { email: '', password: '' };
  registerForm.value = { email: '', password: '', displayName: '' };
  forgotForm.value = { email: '' };
  resetForm.value = { password: '', confirmPassword: '' };
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
  clearAuthLocalError();
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

onMounted(() => {
  bootstrapSession();
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

watch(isAuthenticated, (value) => {
  if (value && isAuthModalOpen.value) {
    closeAuthModal();
  }
  if (value) {
    startPresenceHeartbeat();
  } else {
    clearPresenceTimer();
  }
}, { immediate: true });

watch(
  () => route.fullPath,
  () => {
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
  const email = validateEmailOrShow(loginForm.value.email);
  if (!email) return;
  if (!loginForm.value.password) {
    authLocalError.value = 'Введите пароль.';
    return;
  }

  try {
    await login({
      email,
      password: loginForm.value.password,
    });
    loginForm.value = { email: '', password: '' };
    setSuccessMessage('Вход выполнен. Модальное окно закрыто.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitRegister() {
  clearAuthLocalError();
  const displayNameValue = String(registerForm.value.displayName || '').trim();
  if (!displayNameValue) {
    authLocalError.value = 'Введите отображаемое имя.';
    return;
  }

  const email = validateEmailOrShow(registerForm.value.email);
  if (!email) return;

  const password = validatePasswordOrShow(registerForm.value.password);
  if (!password) return;

  try {
    await register({
      email,
      password,
      displayName: displayNameValue,
    });
    registerForm.value = { email: '', password: '', displayName: '' };
    setSuccessMessage('Профиль создан. Письмо отправлено на указанную почту.');
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
  await logout();
  setSuccessMessage('Сессия завершена.');
}
</script>

<template>
  <header>
    <div class="navwrap">
      <div class="logo-block">
        <div class="logo">Литопотам</div>
      </div>

      <nav class="nav" aria-label="Главное меню">
        <RouterLink to="/">Главная</RouterLink>
        <RouterLink to="/works">Произведения</RouterLink>
        <RouterLink to="/authors">Авторы</RouterLink>
        <RouterLink to="/contests">Конкурсы</RouterLink>
        <RouterLink to="/radio">Радио</RouterLink>
        <RouterLink to="/forum">Форум</RouterLink>
        <RouterLink to="/personal">Мой кабинет</RouterLink>
      </nav>

      <div class="actions">
        <div v-if="isAuthenticated" class="auth-box user-card">
          <div class="stack">
            <div class="section-head">
              <strong>{{ displayName }}</strong>
              <span class="pill good">онлайн</span>
            </div>
            <div class="meta">@{{ currentUser?.login }} · {{ currentUser?.email }}</div>
            <div class="meta">Роль: {{ currentUser?.role }} · статус: {{ currentUser?.status }}</div>
          </div>
          <div class="inline-actions">
            <RouterLink class="btn btn-outline" to="/personal">Мой кабинет</RouterLink>
            <button class="btn btn-outline" type="button" @click="submitLogout">Выйти</button>
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
            <label for="login-email">Email</label>
            <input id="login-email" v-model="loginForm.email" class="input" type="email" inputmode="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="login-password">Пароль</label>
            <input id="login-password" v-model="loginForm.password" class="input" type="password" autocomplete="current-password" required />
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="submit" :disabled="authBusy">{{ authBusy ? 'Входим…' : 'Войти' }}</button>
            <button class="btn btn-ghost" type="button" @click="openAuthModal('forgot')">Забыли пароль?</button>
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
            <label for="register-email">Email</label>
            <input id="register-email" v-model="registerForm.email" class="input" type="email" inputmode="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="register-password">Пароль</label>
            <input id="register-password" v-model="registerForm.password" class="input" type="password" autocomplete="new-password" required />
          </div>
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
            <input id="reset-password" v-model="resetForm.password" class="input" type="password" autocomplete="new-password" required />
          </div>
          <div class="field">
            <label for="reset-password-confirm">Повтори пароль</label>
            <input id="reset-password-confirm" v-model="resetForm.confirmPassword" class="input" type="password" autocomplete="new-password" required />
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

    <footer class="footer">
      Фронт подключён к backend через Apollo Client. Текущий endpoint: <code>{{ endpoint }}</code>
    </footer>
  </main>
</template>
