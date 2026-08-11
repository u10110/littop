<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import {
  SOCIAL_AUTH_CALLBACK_PATH,
  SOCIAL_AUTH_PROVIDERS,
  buildSocialAuthStartUrl,
  getGraphqlEndpoint,
  parseSocialAuthCallbackParams,
} from './lib/auth.js';
import { useSession } from './lib/session.js';
import referenceLogo from './assets/new-reference/littop-reference-logo.png';

const endpoint = getGraphqlEndpoint();
const route = useRoute();
const router = useRouter();
const authMode = ref('login');
const authSuccess = ref('');
const socialAuthFeedback = ref('');
const isAuthModalOpen = ref(false);
const loginForm = ref({
  identifier: '',
  password: '',
});
const registerForm = ref({
  email: '',
  login: '',
  password: '',
  displayName: '',
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
  completeExternalAuthToken,
  logout,
  bootstrapSession,
} = useSession();

const displayName = computed(() => currentUser.value?.profile?.displayName || currentUser.value?.login || 'Автор');

let successTimer = null;
let lastHandledSocialCallback = '';

function clearSuccessTimer() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
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

function openAuthModal(mode = 'login') {
  authMode.value = mode;
  isAuthModalOpen.value = true;
}

function closeAuthModal() {
  isAuthModalOpen.value = false;
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

onMounted(() => {
  bootstrapSession();
  window.addEventListener('littop:open-auth', handleOpenAuthEvent);
});

onBeforeUnmount(() => {
  clearSuccessTimer();
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
});

watch(
  () => route.fullPath,
  () => {
    void handleSocialAuthCallback();
  },
  { immediate: true },
);

async function submitLogin() {
  try {
    await login({
      identifier: loginForm.value.identifier.trim(),
      password: loginForm.value.password,
    });
    loginForm.value = { identifier: '', password: '' };
    setSuccessMessage('Вход выполнен. Модальное окно закрыто.');
    closeAuthModal();
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitRegister() {
  try {
    await register({
      email: registerForm.value.email.trim(),
      login: registerForm.value.login.trim(),
      password: registerForm.value.password,
      displayName: registerForm.value.displayName.trim(),
    });
    registerForm.value = { email: '', login: '', password: '', displayName: '' };
    setSuccessMessage('Профиль создан. Модальное окно закрыто.');
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
  <header class="top"><div class="wrap"><RouterLink to="/" class="logo" aria-label="Littop — на главную"><img :src="referenceLogo" alt="Littop — Литература без границ"></RouterLink><div class="search" role="search"><input aria-label="Поиск по сайту" placeholder="Поиск по сайту"><span class="search-icon" aria-hidden="true">🔎</span></div><div class="header-actions"><template v-if="isAuthenticated"><RouterLink class="header-login" to="/personal">{{ displayName }}</RouterLink><button class="header-register" type="button" @click="submitLogout">Выйти</button></template><template v-else><button class="header-login" type="button" @click="openAuthModal('login')">Войти</button><button class="header-register" type="button" @click="openAuthModal('register')">Регистрация</button></template></div><nav class="menu" aria-label="Основная навигация"><RouterLink to="/works">⌑ Произведения</RouterLink><RouterLink to="/authors">♙ Авторы</RouterLink><RouterLink to="/forum">◌ Сообщество</RouterLink><RouterLink to="/activity">▤ Журнал</RouterLink><RouterLink to="/contests">☆ Конкурсы</RouterLink><RouterLink to="/radio">◉ Радио</RouterLink><details class="more-menu"><summary>Ещё</summary><div class="more-panel"><RouterLink to="/showcase">Витрина</RouterLink><RouterLink to="/rubrics">Рубрики</RouterLink><RouterLink to="/forum-sections">Разделы форума</RouterLink><RouterLink to="/reviews">Отзывы</RouterLink><RouterLink to="/albums">Альбомы</RouterLink><RouterLink to="/blogs">Блоги</RouterLink><RouterLink to="/promotion">Продвижение</RouterLink><RouterLink to="/about">О проекте</RouterLink><RouterLink to="/contacts">Контакты</RouterLink></div></details><RouterLink to="/personal">▣ Кабинет</RouterLink></nav></div></header>

  <Transition name="fade-modal">
    <div v-if="isAuthModalOpen" class="modal-backdrop" @click.self="closeAuthModal">
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="section-head">
          <div class="stack compact-stack">
            <h2 id="auth-modal-title">{{ authMode === 'login' ? 'Авторизация' : 'Регистрация' }}</h2>
            <span class="meta">
              {{ authMode === 'login' ? 'Войди в аккаунт, чтобы открыть personal и живые действия.' : 'Создай профиль и сразу попади в personal.' }}
            </span>
          </div>
          <button class="btn btn-ghost modal-close" type="button" @click="closeAuthModal" aria-label="Закрыть">×</button>
        </div>

        <div class="auth-toggle">
          <button
            class="btn"
            :class="authMode === 'login' ? 'btn-primary' : 'btn-outline'"
            type="button"
            @click="authMode = 'login'"
          >
            Вход
          </button>
          <button
            class="btn"
            :class="authMode === 'register' ? 'btn-primary' : 'btn-outline'"
            type="button"
            @click="authMode = 'register'"
          >
            Регистрация
          </button>
        </div>

        <div v-if="authError" class="message error">{{ authError }}</div>

        <form v-if="authMode === 'login'" class="auth-grid" @submit.prevent="submitLogin">
          <div class="field">
            <label for="login-identifier">Email или логин</label>
            <input id="login-identifier" v-model="loginForm.identifier" class="input" required />
          </div>
          <div class="field">
            <label for="login-password">Пароль</label>
            <input id="login-password" v-model="loginForm.password" class="input" type="password" required />
          </div>
          <button class="btn btn-primary" type="submit" :disabled="authBusy">{{ authBusy ? 'Входим…' : 'Войти' }}</button>
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

        <form v-else class="auth-grid" @submit.prevent="submitRegister">
          <div class="field">
            <label for="register-display-name">Отображаемое имя</label>
            <input id="register-display-name" v-model="registerForm.displayName" class="input" required />
          </div>
          <div class="field">
            <label for="register-login">Логин</label>
            <input id="register-login" v-model="registerForm.login" class="input" required />
          </div>
          <div class="field">
            <label for="register-email">Email</label>
            <input id="register-email" v-model="registerForm.email" class="input" type="email" required />
          </div>
          <div class="field">
            <label for="register-password">Пароль</label>
            <input id="register-password" v-model="registerForm.password" class="input" type="password" required />
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
      </div>
    </div>
  </Transition>

  <main>
    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>
    <div v-if="bootstrapError" class="message error">{{ bootstrapError }}</div>
    <div v-if="socialAuthFeedback" class="message error">{{ socialAuthFeedback }}</div>
    <div v-if="authSuccess" class="message success">{{ authSuccess }}</div>

    <RouterView />

    <footer class="foot"><div class="wrap"><div class="cols"><div><div class="logo">Лито<b>потам</b></div><p class="small">Творческая площадка для авторов и читателей.</p></div><div><h4>Творчество</h4><RouterLink to="/works">Произведения</RouterLink><RouterLink to="/authors">Авторы</RouterLink><RouterLink to="/rubrics">Рубрики</RouterLink><RouterLink to="/showcase">Витрина</RouterLink></div><div><h4>Сообщество</h4><RouterLink to="/forum">Форум</RouterLink><RouterLink to="/contests">Конкурсы</RouterLink><RouterLink to="/radio">Радио</RouterLink><RouterLink to="/activity">Журнал</RouterLink></div><div><h4>О проекте</h4><RouterLink to="/personal">Мой кабинет</RouterLink><RouterLink to="/promotion">Продвижение</RouterLink><RouterLink to="/about">О площадке</RouterLink><RouterLink to="/contacts">Контакты</RouterLink></div></div><div class="copy">littop 2026 ©</div></div></footer>
  </main>
</template>
