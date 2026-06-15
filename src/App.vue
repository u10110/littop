<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

import { getGraphqlEndpoint } from './lib/auth.js';
import { useSession } from './lib/session.js';

const endpoint = getGraphqlEndpoint();
const authMode = ref('login');
const authSuccess = ref('');
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

onMounted(() => {
  bootstrapSession();
});

async function submitLogin() {
  authSuccess.value = '';
  await login({
    identifier: loginForm.value.identifier.trim(),
    password: loginForm.value.password,
  });
  loginForm.value = { identifier: '', password: '' };
  authSuccess.value = 'Вход выполнен. Теперь доступны публикации, комментарии и форумные ответы.';
}

async function submitRegister() {
  authSuccess.value = '';
  await register({
    email: registerForm.value.email.trim(),
    login: registerForm.value.login.trim(),
    password: registerForm.value.password,
    displayName: registerForm.value.displayName.trim(),
  });
  registerForm.value = { email: '', login: '', password: '', displayName: '' };
  authSuccess.value = 'Регистрация прошла успешно. Сессия уже открыта.';
}

async function submitLogout() {
  authSuccess.value = 'Сессия завершена.';
  await logout();
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
            <button class="btn btn-outline" type="button" @click="submitLogout">Выйти</button>
          </div>
        </div>

        <div v-else class="auth-box">
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
    </div>
  </header>

  <main>
    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>
    <div v-if="bootstrapError" class="message error">{{ bootstrapError }}</div>
    <div v-if="authError" class="message error">{{ authError }}</div>
    <div v-if="authSuccess" class="message success">{{ authSuccess }}</div>

    <RouterView />

    <footer class="footer">
      Фронт подключён к backend через Apollo Client. Текущий endpoint: <code>{{ endpoint }}</code>
    </footer>
  </main>
</template>
