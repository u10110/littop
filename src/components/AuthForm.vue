<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  SOCIAL_AUTH_PROVIDERS,
  buildSocialAuthStartUrl,
  getGraphqlEndpoint,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from '../lib/auth.js';
import { useSession } from '../lib/session.js';
import { formatDateTime } from '../lib/format.js';

const props = defineProps({
  initialMode: { type: String, default: 'login' },
  resetToken: { type: String, default: '' },
});

const emit = defineEmits(['success']);

const endpoint = getGraphqlEndpoint();
const route = useRoute();
const router = useRouter();

const authMode = ref(props.initialMode);
const authLocalError = ref('');
const loginPasswordVisible = ref(false);
const registerPasswordVisible = ref(false);
const resetPasswordVisible = ref(false);
const resetConfirmPasswordVisible = ref(false);
const internalResetToken = ref(props.resetToken);

const loginForm = ref({ identifier: '', password: '' });
const registerForm = ref({ email: '', login: '', password: '', displayName: '', acceptTerms: false });
const forgotForm = ref({ email: '' });
const resetForm = ref({ password: '', confirmPassword: '' });

const socialProviders = Object.values(SOCIAL_AUTH_PROVIDERS);

const {
  authBusy,
  authError,
  authMeta,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  reopenClosedAccount,
} = useSession();

watch(
  () => props.initialMode,
  (mode) => {
    authMode.value = mode;
    clearAuthLocalError();
  },
);

watch(
  () => props.resetToken,
  (token) => {
    internalResetToken.value = token || '';
  },
);

const visibleAuthError = computed(() => authLocalError.value || authError.value);

const authModalTitle = computed(
  () =>
    ({
      login: 'Авторизация',
      register: 'Регистрация',
      forgot: 'Восстановление пароля',
      reset: 'Новый пароль',
    }[authMode.value] || 'Авторизация'),
);

const authModalSubtitle = computed(
  () =>
    ({
      login: 'Войди в аккаунт по почте.',
      register: 'Создай профиль по email и сразу попади в personal.',
      forgot: 'Укажи почту — на неё придёт ссылка на форму смены пароля.',
      reset: 'Введи новый пароль дважды.',
    }[authMode.value] || 'Войди в аккаунт по почте.'),
);

const canReopenClosedAccount = computed(
  () =>
    authMode.value === 'login' &&
    authMeta.value?.code === 'ACCOUNT_REOPEN_AVAILABLE' &&
    String(loginForm.value.identifier || '').trim() &&
    String(loginForm.value.password || '').trim(),
);

const reopenUntilLabel = computed(() => formatDateTime(authMeta.value?.reopenUntil));

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

function openAuthModal(mode = 'login') {
  authMode.value = mode;
  clearAuthLocalError();
  if (mode !== 'reset') {
    internalResetToken.value = '';
  }
}

function providerLabel(providerCode) {
  return SOCIAL_AUTH_PROVIDERS[providerCode]?.label || 'соцсеть';
}

function startSocialAuth(provider, mode = 'login') {
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
    await login({ identifier, password: loginForm.value.password });
    loginForm.value = { identifier: '', password: '' };
    loginPasswordVisible.value = false;
    emit('success', 'Вход выполнен.');
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
    await reopenClosedAccount({ identifier, password: loginForm.value.password });
    loginForm.value = { identifier: '', password: '' };
    loginPasswordVisible.value = false;
    emit('success', 'Аккаунт снова открыт. Вы вошли автоматически.');
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
    emit('success', 'Профиль создан. Добро пожаловать!');
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
    emit('success', 'Письмо со ссылкой для восстановления отправлено.');
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}

async function submitResetPassword() {
  clearAuthLocalError();
  if (!internalResetToken.value) {
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
    await resetPassword({ token: internalResetToken.value, password });
    resetForm.value = { password: '', confirmPassword: '' };
    await clearResetRouteState();
    emit('success', 'Пароль обновлён. Вы вошли в аккаунт.');
  } catch {
    // Ошибка уже отдана в authError из session store.
  }
}
</script>

<template>
  <div class="auth-modal-body">
    <div class="section-head">
      <div class="stack compact-stack">
        <h2 id="auth-modal-title">{{ authModalTitle }}</h2>
        <span class="meta">{{ authModalSubtitle }}</span>
      </div>
    </div>

    <div v-if="authMode === 'login' || authMode === 'register'" class="auth-toggle">
      <button
        class="btn"
        :class="authMode === 'login' ? 'btn-primary' : 'btn-outline'"
        type="button"
        @click="openAuthModal('login')"
      >
        <Icon name="log-in" />Вход
      </button>
      <button
        class="btn"
        :class="authMode === 'register' ? 'btn-primary' : 'btn-outline'"
        type="button"
        @click="openAuthModal('register')"
      >
        <Icon name="user-plus" />Регистрация
      </button>
    </div>

    <div v-else class="inline-actions">
      <button class="btn btn-outline" type="button" @click="openAuthModal('login')">
        <Icon name="arrow-left" />Назад ко входу
      </button>
      <button v-if="authMode !== 'register'" class="btn btn-outline" type="button" @click="openAuthModal('register')">
        <Icon name="user-plus" />Регистрация
      </button>
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
            <Icon :name="loginPasswordVisible ? 'eye-off' : 'eye'" />
          </button>
        </div>
      </div>
      <div class="inline-actions">
        <button class="btn btn-primary" type="submit" :disabled="authBusy">
          <Icon name="log-in" />{{ authBusy ? 'Входим…' : 'Войти' }}
        </button>
        <button class="btn btn-ghost" type="button" @click="openAuthModal('forgot')">Забыли пароль?</button>
      </div>
      <div v-if="canReopenClosedAccount" class="message warn">
        <div>Аккаунт закрыт, но его ещё можно открыть{{ reopenUntilLabel && reopenUntilLabel !== '—' ? ` до ${reopenUntilLabel}` : '' }}.</div>
        <div class="inline-actions">
          <button class="btn btn-primary" type="button" :disabled="authBusy" @click="submitReopenClosedAccount">
            <Icon name="rotate-ccw" />Открыть аккаунт
          </button>
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
            <Icon :name="registerPasswordVisible ? 'eye-off' : 'eye'" />
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
        <Icon name="user-plus" />{{ authBusy ? 'Создаём профиль…' : 'Создать профиль' }}
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
        <Icon name="mail" />{{ authBusy ? 'Отправляем…' : 'Отправить письмо' }}
      </button>
    </form>

    <form v-else class="auth-grid" @submit.prevent="submitResetPassword">
      <div class="field">
        <label for="reset-password">Новый пароль</label>
        <div class="password-input-row">
          <input
            id="reset-password"
            v-model="resetForm.password"
            class="input"
            :type="resetPasswordVisible ? 'text' : 'password'"
            autocomplete="new-password"
            required
          />
          <button
            class="btn btn-outline password-toggle"
            type="button"
            :aria-pressed="resetPasswordVisible"
            :aria-label="resetPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
            @click="resetPasswordVisible = !resetPasswordVisible"
          >
            <Icon :name="resetPasswordVisible ? 'eye-off' : 'eye'" />
          </button>
        </div>
      </div>
      <div class="field">
        <label for="reset-password-confirm">Повтори пароль</label>
        <div class="password-input-row">
          <input
            id="reset-password-confirm"
            v-model="resetForm.confirmPassword"
            class="input"
            :type="resetConfirmPasswordVisible ? 'text' : 'password'"
            autocomplete="new-password"
            required
          />
          <button
            class="btn btn-outline password-toggle"
            type="button"
            :aria-pressed="resetConfirmPasswordVisible"
            :aria-label="resetConfirmPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
            @click="resetConfirmPasswordVisible = !resetConfirmPasswordVisible"
          >
            <Icon :name="resetConfirmPasswordVisible ? 'eye-off' : 'eye'" />
          </button>
        </div>
      </div>
      <button class="btn btn-primary" type="submit" :disabled="authBusy">
        <Icon name="save" />{{ authBusy ? 'Сохраняем…' : 'Сохранить новый пароль' }}
      </button>
    </form>
  </div>
</template>
