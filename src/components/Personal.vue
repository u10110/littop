<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import WorkPublishForm from './WorkPublishForm.vue';
import { useSession } from '../lib/session.js';
import { formatDate, formatDateTime } from '../lib/format.js';

const {
  currentUser,
  isAuthenticated,
  bootstrapped,
  profileBusy,
  profileError,
  bootstrapSession,
  saveProfile,
} = useSession();

const profile = computed(() => currentUser.value?.profile ?? null);
const displayName = computed(() => profile.value?.displayName || currentUser.value?.login || 'Автор');
const myWorksLink = computed(() => ({
  path: '/works',
  query: { mine: '1' },
}));
const profileSuccess = ref('');
const publishStatus = ref('');
const profileForm = ref({
  displayName: '',
  city: '',
  websiteUrl: '',
  bio: '',
});

onMounted(() => {
  bootstrapSession();
});

function syncProfileForm({ clearSuccess = false } = {}) {
  if (clearSuccess) {
    profileSuccess.value = '';
  }

  profileForm.value = {
    displayName: currentUser.value?.profile?.displayName || currentUser.value?.login || '',
    city: currentUser.value?.profile?.city || '',
    websiteUrl: currentUser.value?.profile?.websiteUrl || '',
    bio: currentUser.value?.profile?.bio || '',
  };
}

watch(
  currentUser,
  () => {
    syncProfileForm();
  },
  { immediate: true },
);

function openAuthModal(mode = 'login') {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } }));
}

function resetProfileForm() {
  syncProfileForm({ clearSuccess: true });
}

async function submitProfile() {
  profileSuccess.value = '';
  try {
    await saveProfile({
      displayName: profileForm.value.displayName,
      city: profileForm.value.city,
      websiteUrl: profileForm.value.websiteUrl,
      bio: profileForm.value.bio,
    });
    syncProfileForm();
    profileSuccess.value = 'Данные кабинета сохранены.';
  } catch {
    // Ошибка уже проброшена в profileError.
  }
}

function handleWorkCreated(createdWork) {
  const title = createdWork?.title ? ` «${createdWork.title}»` : '';
  publishStatus.value = `Новая публикация${title} сохранена. Открой «Мои произведения», чтобы сразу её увидеть.`;
}
</script>

<template>
  <section class="section-block">
    <div class="page-head">
      <div class="chips">
        <span class="pill">Личный раздел</span>
        <span class="pill" :class="isAuthenticated ? 'good' : 'warn'">
          {{ isAuthenticated ? 'Сессия активна' : 'Нужен вход' }}
        </span>
      </div>
      <h1>Мой кабинет</h1>
      <p>
        Здесь можно редактировать профиль автора, быстро перейти к своим произведениям и сразу опубликовать новый текст.
      </p>
    </div>

    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>

    <div v-else-if="!isAuthenticated" class="panel personal-guest-panel">
      <h2>Сначала авторизуйся</h2>
      <p class="muted">
        Для доступа к кабинету нужен вход в аккаунт. Открой модальное окно авторизации и после входа страница
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
              <div class="meta">Логин</div>
              <strong>@{{ currentUser?.login || '—' }}</strong>
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
            <h2>Редактирование данных</h2>
            <span class="pill">Сохранение в backend</span>
          </div>

          <div class="note">Email и логин пока отображаются как справочные поля. Редактируются данные профиля автора.</div>

          <div v-if="profileError" class="message error">{{ profileError }}</div>
          <div v-if="profileSuccess" class="message success">{{ profileSuccess }}</div>

          <form class="auth-grid" @submit.prevent="submitProfile">
            <div class="field">
              <label for="profile-display-name">Отображаемое имя</label>
              <input id="profile-display-name" v-model="profileForm.displayName" class="input" required />
            </div>

            <div class="field">
              <label for="profile-city">Город</label>
              <input id="profile-city" v-model="profileForm.city" class="input" placeholder="Например, Москва" />
            </div>

            <div class="field">
              <label for="profile-website">Сайт</label>
              <input id="profile-website" v-model="profileForm.websiteUrl" class="input" placeholder="https://example.com" />
            </div>

            <div class="field">
              <label for="profile-bio">О себе</label>
              <textarea id="profile-bio" v-model="profileForm.bio" class="textarea" placeholder="Короткое описание автора"></textarea>
            </div>

            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="profileBusy">
                {{ profileBusy ? 'Сохраняем…' : 'Сохранить изменения' }}
              </button>
              <button class="btn btn-outline" type="button" :disabled="profileBusy" @click="resetProfileForm">
                Сбросить
              </button>
            </div>
          </form>
        </article>
      </section>

      <section class="layout-columns personal-layout">
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

        <article class="panel">
          <div class="section-head">
            <h2>Быстрые переходы</h2>
            <span class="meta">Из кабинета</span>
          </div>
          <div class="inline-actions">
            <RouterLink class="btn btn-primary" :to="myWorksLink">Мои произведения</RouterLink>
            <a class="btn btn-outline" href="#publish-work">Добавить публикацию</a>
            <RouterLink class="btn btn-outline" to="/works">Все произведения</RouterLink>
            <RouterLink class="btn btn-outline" to="/authors">Авторы</RouterLink>
            <RouterLink class="btn btn-outline" to="/forum">Форум</RouterLink>
          </div>
          <div class="note">
            Кнопка «Мои произведения» открывает каталог сразу с фильтром <code>?mine=1</code> из адресной строки.
          </div>
        </article>
      </section>

      <section id="publish-work" class="section-block">
        <div v-if="publishStatus" class="message success">{{ publishStatus }}</div>
        <WorkPublishForm @created="handleWorkCreated" />
      </section>
    </template>
  </section>
</template>
