<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';

import { useSession } from '../lib/session.js';
import { formatDate, formatDateTime } from '../lib/format.js';

const { currentUser, isAuthenticated, bootstrapped, bootstrapSession } = useSession();

const profile = computed(() => currentUser.value?.profile ?? null);
const displayName = computed(() => profile.value?.displayName || currentUser.value?.login || 'Автор');

onMounted(() => {
  bootstrapSession();
});

function openAuthModal(mode = 'login') {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } }));
}
</script>

<template>
  <section class="section-block">
    <div class="page-head">
      <div class="chips">
        <span class="pill">Личный раздел</span>
        <span class="pill">Редактриоване</span>
        <span class="pill" :class="isAuthenticated ? 'good' : 'warn'">
          {{ isAuthenticated ? 'Сессия активна' : 'Нужен вход' }}
        </span>
      </div>
      <h1>Мой кабинет</h1>
      <p>
        Страница персонального кабинета автора. Здесь собраны профиль, статус аккаунта и быстрые переходы
        к публикациям, авторам и форуму.
      </p>
    </div>

    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>

    <div v-else-if="!isAuthenticated" class="panel personal-guest-panel">
      <h2>Сначала авторизуйся</h2>
      <p class="muted">
        Для доступа к personal нужен вход в аккаунт. Открой модальное окно авторизации и после входа страница
        сразу станет доступна.
      </p>
      <div class="inline-actions">
        <button class="btn btn-primary" type="button" @click="openAuthModal('login')">Открыть вход</button>
        <button class="btn btn-outline" type="button" @click="openAuthModal('register')">Регистрация</button>
        <RouterLink class="btn btn-outline" to="/">На главную</RouterLink>
      </div>
    </div>

    <template v-else>
      <section class="stats-grid">
        <article class="card stat">
          <span class="meta">Автор</span>
          <span class="value">{{ displayName }}</span>
          <span class="note">@{{ currentUser?.login }}</span>
        </article>
        <article class="card stat">
          <span class="meta">Роль</span>
          <span class="value">{{ currentUser?.role || 'reader' }}</span>
          <span class="note">Статус: {{ currentUser?.status || 'active' }}</span>
        </article>
        <article class="card stat">
          <span class="meta">Произведения</span>
          <span class="value">{{ profile?.worksCountCached ?? 0 }}</span>
          <span class="note">Сохранено в профиле</span>
        </article>
        <article class="card stat">
          <span class="meta">Рейтинг</span>
          <span class="value">{{ profile?.ratingTotal ?? 0 }}</span>
          <span class="note">Суммарная оценка автора</span>
        </article>
      </section>

      <section class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Профиль</h2>
            <span class="pill good">online</span>
          </div>

          <div class="list personal-details">
            <div class="inline-card">
              <div class="meta">Email</div>
              <strong>{{ currentUser?.email || '—' }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Отображаемое имя</div>
              <strong>{{ displayName }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Город</div>
              <strong>{{ profile?.city || 'Не указан' }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Сайт</div>
              <strong>{{ profile?.websiteUrl || 'Не указан' }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">О себе</div>
              <div>{{ profile?.bio || 'Пока без описания.' }}</div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="section-head">
            <h2>Активность</h2>
            <span class="pill">Данные из session/me</span>
          </div>

          <div class="list personal-details">
            <div class="inline-card">
              <div class="meta">Регистрация</div>
              <strong>{{ formatDate(currentUser?.registeredAt || currentUser?.createdAt) }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Последний вход</div>
              <strong>{{ formatDateTime(currentUser?.lastLoginAt) }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Подборки</div>
              <div class="chips">
                <span class="pill" :class="profile?.isFeatured ? 'good' : 'warn'">
                  {{ profile?.isFeatured ? 'В витрине' : 'Не в витрине' }}
                </span>
                <span class="pill" :class="profile?.isClassic ? 'good' : 'warn'">
                  {{ profile?.isClassic ? 'Классик' : 'Обычный автор' }}
                </span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="panel">
        <div class="section-head">
          <h2>Быстрые переходы</h2>
          <span class="meta">Из personal</span>
        </div>
        <div class="inline-actions">
          <RouterLink class="btn btn-primary" to="/works">Мои и новые произведения</RouterLink>
          <RouterLink class="btn btn-outline" to="/authors">Авторы</RouterLink>
          <RouterLink class="btn btn-outline" to="/forum">Форум</RouterLink>
          <RouterLink class="btn btn-outline" to="/contests">Конкурсы</RouterLink>
        </div>
      </section>
    </template>
  </section>
</template>
