<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

import { getGraphqlEndpoint } from './lib/auth.js';
import { useSession } from './lib/session.js';

const endpoint = getGraphqlEndpoint();
const route = useRoute();
const authMode = ref('login');
const authSuccess = ref('');
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

const {
  currentUser,
  isAuthenticated,
  authBusy,
  authError,
  bootstrapError,
  bootstrapped,
  login,
  register,
  logout,
  bootstrapSession,
} = useSession();

const displayName = computed(() => currentUser.value?.profile?.displayName || currentUser.value?.login || 'Автор');

let successTimer = null;

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
  <header>
    <div class="navwrap">
      <div class="logo-block">
        <div class="logo">Литопотам</div>
        <div class="logo-subtitle">Vue 3 + Vue Apollo + GraphQL backend</div>
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
        </form>
      </div>
    </div>
  </Transition>

  <main>
    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>
    <div v-if="bootstrapError" class="message error">{{ bootstrapError }}</div>
    <div v-if="authSuccess" class="message success">{{ authSuccess }}</div>

    <RouterView />

    <footer class="footer">
      Фронт подключён к backend через Apollo Client. Текущий endpoint: <code>{{ endpoint }}</code>
    </footer>
  </main>
</template>
