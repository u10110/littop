<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AuthForm from './AuthForm.vue';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();
const { isAuthenticated } = useSession();

const initialMode = computed(() => {
  if (route.query?.mode === 'register') return 'register';
  if (route.query?.auth === 'reset') return 'reset';
  return 'login';
});

const resetToken = computed(() => route.query?.token || '');

function onSuccess() {
  router.push('/');
}

// Если пользователь уже авторизован — сразу на главную.
watch(
  isAuthenticated,
  (value) => {
    if (value) router.push('/');
  },
  { immediate: true },
);
</script>

<template>
  <div class="login-page">
    <div class="login-page-card">
      <AuthForm :initial-mode="initialMode" :reset-token="resetToken" @success="onSuccess" />
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 70vh;
  padding: 56px 16px;
  box-sizing: border-box;
}

.login-page-card {
  width: 100%;
  max-width: 460px;
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
</style>
