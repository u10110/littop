<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import WorkPublishForm from './WorkPublishForm.vue';
import { useSession } from '../lib/session.js';
import { formatDate, formatDateTime } from '../lib/format.js';
import { filenameToTrackTitle, probeAudioDuration, uploadRadioTrack } from '../lib/radio.js';
import { uploadProfileImage } from '../lib/profileImages.js';
import { buildAuthorPageLocation } from '../lib/routes.js';

const {
  currentUser,
  isAuthenticated,
  bootstrapped,
  profileBusy,
  profileError,
  bootstrapSession,
  saveProfile,
  closeAccount,
} = useSession();

const profile = computed(() => currentUser.value?.profile ?? null);
const displayName = computed(() => profile.value?.displayName || currentUser.value?.login || 'Автор');
const myWorksLink = computed(() => ({
  path: '/works',
  query: { mine: '1' },
}));
const myAuthorPageLink = computed(() => buildAuthorPageLocation(currentUser.value?.login || ''));
const profileSuccess = ref('');
const accountClosureStatus = ref('');
const publishStatus = ref('');
const audioBusy = ref(false);
const audioError = ref('');
const audioSuccess = ref('');
const audioFileInput = ref(null);
const avatarFileInput = ref(null);
const coverFileInput = ref(null);
const profileImageBusy = ref(false);
const profileImageError = ref('');
const profileImageSuccess = ref('');
const avatarImageFile = ref(null);
const coverImageFile = ref(null);
const profileForm = ref({
  displayName: '',
  city: '',
  websiteUrl: '',
  bio: '',
  avatarUrl: '',
  coverImageUrl: '',
});
const audioForm = ref({
  title: '',
  file: null,
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
    avatarUrl: currentUser.value?.profile?.avatarUrl || '',
    coverImageUrl: currentUser.value?.profile?.coverImageUrl || '',
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

function buildProfilePayload(overrides = {}) {
  return {
    displayName: profileForm.value.displayName,
    city: profileForm.value.city,
    websiteUrl: profileForm.value.websiteUrl,
    bio: profileForm.value.bio,
    avatarUrl: profileForm.value.avatarUrl || null,
    coverImageUrl: profileForm.value.coverImageUrl || null,
    ...overrides,
  };
}

async function submitProfile() {
  profileSuccess.value = '';
  try {
    await saveProfile(buildProfilePayload());
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

function resetAudioForm() {
  audioForm.value = {
    title: '',
    file: null,
  };
  audioError.value = '';
  audioSuccess.value = '';
  if (audioFileInput.value) {
    audioFileInput.value.value = '';
  }
}

function handleAudioFileChange(event) {
  const file = event?.target?.files?.[0] ?? null;
  audioForm.value.file = file;
  audioError.value = '';
  audioSuccess.value = '';

  if (file && !audioForm.value.title.trim()) {
    audioForm.value.title = filenameToTrackTitle(file.name);
  }
}

async function submitAudio() {
  audioBusy.value = true;
  audioError.value = '';
  audioSuccess.value = '';

  try {
    const file = audioForm.value.file;
    const durationSeconds = await probeAudioDuration(file);
    const track = await uploadRadioTrack({
      title: audioForm.value.title,
      file,
      durationSeconds,
    });
    const title = track?.title ? ` «${track.title}»` : '';
    resetAudioForm();
    audioSuccess.value = `Аудио${title} загружено. Оно уже доступно на странице «Радио».`;
  } catch (error) {
    audioError.value = error instanceof Error ? error.message : 'Не удалось загрузить аудио.';
  } finally {
    audioBusy.value = false;
  }
}

function handleProfileImageChange(kind, event) {
  const file = event?.target?.files?.[0] ?? null;
  if (kind === 'avatar') {
    avatarImageFile.value = file;
  } else {
    coverImageFile.value = file;
  }
  profileImageError.value = '';
  profileImageSuccess.value = '';
}

function resetProfileImageSelection(kind) {
  if (kind === 'avatar') {
    avatarImageFile.value = null;
    if (avatarFileInput.value) {
      avatarFileInput.value.value = '';
    }
    return;
  }

  coverImageFile.value = null;
  if (coverFileInput.value) {
    coverFileInput.value.value = '';
  }
}

async function submitProfileImage(kind) {
  const file = kind === 'avatar' ? avatarImageFile.value : coverImageFile.value;
  profileImageBusy.value = true;
  profileImageError.value = '';
  profileImageSuccess.value = '';

  try {
    const imageUrl = await uploadProfileImage({ kind, file });
    const patch = kind === 'avatar'
      ? { avatarUrl: imageUrl }
      : { coverImageUrl: imageUrl };

    await saveProfile(buildProfilePayload(patch));
    syncProfileForm();
    resetProfileImageSelection(kind);
    profileImageSuccess.value = kind === 'avatar'
      ? 'Аватарка сохранена. Она будет показываться у сообщений и рецензий.'
      : 'Большое фото автора сохранено. Оно уже доступно на публичной странице автора.';
  } catch (error) {
    profileImageError.value = error instanceof Error ? error.message : 'Не удалось загрузить изображение.';
  } finally {
    profileImageBusy.value = false;
  }
}

async function submitAccountClosure() {
  const confirmed = globalThis.confirm?.('Закрыть аккаунт автора? Публикации будут сняты с витрины, а сессия завершится.') ?? true;
  if (!confirmed) return;

  accountClosureStatus.value = '';
  try {
    await closeAccount();
    accountClosureStatus.value = 'Аккаунт закрыт. Сессия завершена.';
  } catch {
    // Текст уже лежит в profileError.
  }
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
        Здесь можно редактировать профиль автора, загрузить большое фото и аватарку, быстро перейти к своим произведениям и сразу опубликовать новый текст.
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
          <span class="value">
            <RouterLink v-if="currentUser?.login" class="user-inline-link" :to="myAuthorPageLink">{{ displayName }}</RouterLink>
            <template v-else>{{ displayName }}</template>
          </span>
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
              <RouterLink v-if="currentUser?.login" class="user-inline-link" :to="myAuthorPageLink"><strong>{{ displayName }}</strong></RouterLink>
              <strong v-else>{{ displayName }}</strong>
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
              <button class="btn btn-primary" type="submit" :disabled="profileBusy || profileImageBusy">
                {{ profileBusy ? 'Сохраняем…' : 'Сохранить изменения' }}
              </button>
              <button class="btn btn-outline" type="button" :disabled="profileBusy || profileImageBusy" @click="resetProfileForm">
                Сбросить
              </button>
              <RouterLink v-if="currentUser?.login" class="btn btn-outline" :to="myAuthorPageLink">Открыть страницу автора</RouterLink>
            </div>
          </form>
        </article>
      </section>

      <section class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Фото автора</h2>
            <span class="pill">Аватар + большое фото</span>
          </div>

          <div class="note">
            Аватарка идёт в форум и рецензии, а большое фото показывается на публичной странице автора отдельным крупным блоком.
          </div>

          <div v-if="profileImageError" class="message error">{{ profileImageError }}</div>
          <div v-if="profileImageSuccess" class="message success">{{ profileImageSuccess }}</div>

          <div class="profile-image-grid">
            <div class="profile-image-card">
              <div class="meta">Аватарка для сообщений и рецензий</div>
              <div class="profile-image-preview profile-image-preview-avatar">
                <img v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" class="profile-image-preview-img" alt="Аватар автора" />
                <div v-else class="profile-image-placeholder">Нет аватарки</div>
              </div>
              <input
                ref="avatarFileInput"
                class="input"
                type="file"
                accept="image/*"
                @change="handleProfileImageChange('avatar', $event)"
              />
              <div class="inline-actions">
                <button class="btn btn-primary" type="button" :disabled="profileImageBusy" @click="submitProfileImage('avatar')">
                  {{ profileImageBusy ? 'Загружаем…' : 'Загрузить аватарку' }}
                </button>
                <button class="btn btn-outline" type="button" :disabled="profileImageBusy" @click="resetProfileImageSelection('avatar')">Сбросить</button>
              </div>
            </div>

            <div class="profile-image-card">
              <div class="meta">Большое фото автора</div>
              <div class="profile-image-preview profile-image-preview-cover">
                <img v-if="profileForm.coverImageUrl" :src="profileForm.coverImageUrl" class="profile-image-preview-img profile-image-preview-img-cover" alt="Большое фото автора" />
                <div v-else class="profile-image-placeholder">Нет большого фото</div>
              </div>
              <input
                ref="coverFileInput"
                class="input"
                type="file"
                accept="image/*"
                @change="handleProfileImageChange('cover', $event)"
              />
              <div class="inline-actions">
                <button class="btn btn-primary" type="button" :disabled="profileImageBusy" @click="submitProfileImage('cover')">
                  {{ profileImageBusy ? 'Загружаем…' : 'Загрузить большое фото' }}
                </button>
                <button class="btn btn-outline" type="button" :disabled="profileImageBusy" @click="resetProfileImageSelection('cover')">Сбросить</button>
              </div>
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

      <section class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Быстрые переходы</h2>
            <span class="meta">Из кабинета</span>
          </div>
          <div class="inline-actions">
            <RouterLink class="btn btn-primary" :to="myWorksLink">Мои произведения</RouterLink>
            <a class="btn btn-outline" href="#publish-work">Добавить публикацию</a>
            <a class="btn btn-outline" href="#upload-audio">Добавить аудио</a>
            <RouterLink v-if="currentUser?.login" class="btn btn-outline" :to="myAuthorPageLink">Авторская страница</RouterLink>
            <RouterLink class="btn btn-outline" to="/radio">Радио</RouterLink>
            <RouterLink class="btn btn-outline" to="/works">Все произведения</RouterLink>
            <RouterLink class="btn btn-outline" to="/authors">Авторы</RouterLink>
            <RouterLink class="btn btn-outline" to="/forum">Форум</RouterLink>
          </div>
          <div class="note">
            Кнопка «Мои произведения» открывает каталог сразу с фильтром <code>?mine=1</code> из адресной строки.
          </div>
        </article>
      </section>

      <section class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Закрытие аккаунта</h2>
            <span class="pill warn">soft delete</span>
          </div>
          <div class="note">
            Аккаунт автора будет закрыт: сессия завершится, произведения уйдут в архив, а форумные записи будут скрыты.
          </div>
          <div v-if="accountClosureStatus" class="message success">{{ accountClosureStatus }}</div>
          <div class="inline-actions">
            <button class="btn btn-danger" type="button" :disabled="profileBusy" @click="submitAccountClosure">
              {{ profileBusy ? 'Закрываем…' : 'Закрыть аккаунт' }}
            </button>
          </div>
        </article>
      </section>

      <section id="publish-work" class="section-block">
        <div v-if="publishStatus" class="message success">{{ publishStatus }}</div>
        <WorkPublishForm @created="handleWorkCreated" />
      </section>

      <section id="upload-audio" class="section-block">
        <article class="panel">
          <div class="section-head">
            <h2>Добавить аудио</h2>
            <span class="pill">Файл → папка + БД</span>
          </div>

          <p class="note">
            Загруженный аудиофайл сохраняется на сервере, запись попадает в <code>radio_tracks</code>, а трек сразу
            появляется на странице «Радио».
          </p>

          <div v-if="audioError" class="message error">{{ audioError }}</div>
          <div v-if="audioSuccess" class="message success">{{ audioSuccess }}</div>

          <form class="auth-grid" @submit.prevent="submitAudio">
            <div class="field">
              <label for="audio-title">Название аудио</label>
              <input id="audio-title" v-model="audioForm.title" class="input" required placeholder="Например, Вечерний эфир" />
            </div>

            <div class="field">
              <label for="audio-file">Аудиофайл</label>
              <input
                id="audio-file"
                ref="audioFileInput"
                class="input"
                type="file"
                accept="audio/*"
                required
                @change="handleAudioFileChange"
              />
            </div>

            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="audioBusy">
                {{ audioBusy ? 'Загружаем…' : 'Загрузить аудио' }}
              </button>
              <button class="btn btn-outline" type="button" :disabled="audioBusy" @click="resetAudioForm">
                Сбросить
              </button>
              <RouterLink class="btn btn-outline" to="/radio">Открыть радио</RouterLink>
            </div>
          </form>
        </article>
      </section>
    </template>
  </section>
</template>
