<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RouterLink } from 'vue-router';

import WorkPublishForm from './WorkPublishForm.vue';
import { useSession } from '../lib/session.js';
import { formatDate, formatDateTime } from '../lib/format.js';
import { filenameToTrackTitle, probeAudioDuration, uploadRadioTrack } from '../lib/radio.js';
import { uploadProfileImage } from '../lib/profileImages.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { apolloClient } from '../lib/apollo.js';
import { MY_MANAGED_AUTHORS_QUERY, MY_PEACH_TRANSACTIONS_QUERY, MY_RATING_EVENTS_QUERY, PURCHASE_AUDIO_UPLOAD_PACK_MUTATION, REQUEST_ADMIN_REVIEW_MUTATION, WORKS_QUERY } from '../lib/graphql.js';

const {
  currentUser,
  isAuthenticated,
  bootstrapped,
  profileBusy,
  profileError,
  authBusy,
  hasStoredOwnerSession,
  bootstrapSession,
  saveProfile,
  switchToManagedAuthor,
  restoreOwnerSession,
} = useSession();

const myWorksQueryVariables = computed(() => ({
  limit: 4,
  offset: 0,
  sectionCode: null,
  genreSlug: null,
  search: null,
  authorId: currentUser.value?.id ?? null,
  createdToday: null,
}));
const { result: myWorksResult, loading: myWorksLoading } = useQuery(
  WORKS_QUERY,
  myWorksQueryVariables,
  () => ({ enabled: Boolean(currentUser.value?.id), fetchPolicy: 'cache-and-network' }),
);
const myRecentWorks = computed(() => myWorksResult.value?.works ?? []);
const peachTransactions = ref([]);
const peachTransactionsBusy = ref(false);
const peachTransactionsError = ref('');
const ratingEvents = ref([]);
const ratingEventsBusy = ref(false);
const ratingEventsError = ref('');
const ratingHistoryOpen = ref(false);
const peachHistoryOpen = ref(false);
const peachBusy = ref(false);
const peachStatus = ref('');
const reviewBusy = ref(false);
const reviewStatus = ref('');
const reviewForm = ref({ title: '', message: '' });
const peachBalance = computed(() => Number(profile.value?.peachBalance ?? 0));
const audioUploadSlots = computed(() => Number(profile.value?.audioUploadSlots ?? 0));
const ratingTotal = computed(() => Number(profile.value?.ratingTotal ?? 0));
const ratingMonthPoints = computed(() => ratingEvents.value.filter((event) => new Date(event.createdAt).getMonth() === new Date().getMonth() && new Date(event.createdAt).getFullYear() === new Date().getFullYear()).reduce((total, event) => total + Number(event.points || 0), 0));

const profile = computed(() => currentUser.value?.profile ?? null);
const displayName = computed(() => profile.value?.displayName || currentUser.value?.login || 'Автор');
const myWorksLink = computed(() => ({
  path: '/works',
  query: { mine: '1' },
}));
const myAuthorPageLink = computed(() => buildAuthorPageLocation(currentUser.value?.login || ''));
const profileSuccess = ref('');
const managedAuthors = ref([]);
const managedAuthorsBusy = ref(false);
const managedAuthorsError = ref('');
const managedSwitchStatus = ref('');
const isAdmin = computed(() => currentUser.value?.role === 'admin');
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
  profileLinks: [],
});
const audioForm = ref({
  title: '',
  file: null,
});

onMounted(() => {
  bootstrapSession();
});

async function loadManagedAuthors() {
  if (!isAdmin.value) {
    managedAuthors.value = [];
    return;
  }
  managedAuthorsBusy.value = true;
  managedAuthorsError.value = '';
  try {
    const { data } = await apolloClient.query({
      query: MY_MANAGED_AUTHORS_QUERY,
      variables: { limit: 100 },
      fetchPolicy: 'network-only',
    });
    managedAuthors.value = data?.myManagedAuthors ?? [];
  } catch (error) {
    managedAuthorsError.value = error instanceof Error ? error.message : 'Не удалось загрузить управляемые аккаунты.';
  } finally {
    managedAuthorsBusy.value = false;
  }
}

async function switchManagedAuthor(author) {
  managedSwitchStatus.value = '';
  try {
    await switchToManagedAuthor(author.id);
    managedSwitchStatus.value = `Открыт кабинет автора «${author.displayName}». Теперь публикации и изменения будут выполняться от его имени.`;
  } catch (error) {
    managedSwitchStatus.value = error instanceof Error ? error.message : 'Не удалось переключить аккаунт.';
  }
}

async function returnToAdminAccount() {
  managedSwitchStatus.value = '';
  try {
    await restoreOwnerSession();
    managedSwitchStatus.value = 'Вы вернулись в аккаунт администратора.';
  } catch (error) {
    managedSwitchStatus.value = error instanceof Error ? error.message : 'Не удалось вернуться в аккаунт администратора.';
  }
}

async function loadCabinetStatistics() {
  if (!isAuthenticated.value) {
    peachTransactions.value = [];
    ratingEvents.value = [];
    return;
  }

  peachTransactionsBusy.value = true;
  ratingEventsBusy.value = true;
  peachTransactionsError.value = '';
  ratingEventsError.value = '';
  try {
    const [peaches, ratings] = await Promise.all([
      apolloClient.query({ query: MY_PEACH_TRANSACTIONS_QUERY, variables: { limit: 50 }, fetchPolicy: 'network-only' }),
      apolloClient.query({ query: MY_RATING_EVENTS_QUERY, variables: { limit: 50 }, fetchPolicy: 'network-only' }),
    ]);
    peachTransactions.value = peaches.data?.myPeachTransactions ?? [];
    ratingEvents.value = ratings.data?.myRatingEvents ?? [];
  } catch {
    peachTransactionsError.value = 'Не удалось загрузить историю персиков.';
    ratingEventsError.value = 'Не удалось загрузить историю рейтинга.';
  } finally {
    peachTransactionsBusy.value = false;
    ratingEventsBusy.value = false;
  }
}

async function purchaseAudioPack() {
  peachBusy.value = true;
  peachStatus.value = '';
  try {
    await apolloClient.mutate({ mutation: PURCHASE_AUDIO_UPLOAD_PACK_MUTATION });
    await bootstrapSession();
    await loadCabinetStatistics();
    peachStatus.value = 'Пакет из 20 аудио-слотов куплен.';
  } catch (error) {
    peachStatus.value = error instanceof Error ? error.message : 'Не удалось купить аудио-слоты.';
  } finally { peachBusy.value = false; }
}

async function submitReviewRequest() {
  reviewBusy.value = true;
  reviewStatus.value = '';
  try {
    await apolloClient.mutate({ mutation: REQUEST_ADMIN_REVIEW_MUTATION, variables: { title: reviewForm.value.title, message: reviewForm.value.message || null } });
    reviewForm.value = { title: '', message: '' };
    await bootstrapSession();
    await loadCabinetStatistics();
    reviewStatus.value = 'Заявка на рецензию отправлена.';
  } catch (error) {
    reviewStatus.value = error instanceof Error ? error.message : 'Не удалось отправить заявку.';
  } finally { reviewBusy.value = false; }
}

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
    profileLinks: Array.isArray(currentUser.value?.profile?.profileLinks)
      ? currentUser.value.profile.profileLinks.map((link) => ({ label: link?.label || '', url: link?.url || '' }))
      : [],
  };
}

watch(
  currentUser,
  () => {
    syncProfileForm();
    loadCabinetStatistics();
    loadManagedAuthors();
  },
  { immediate: true },
);

function openAuthModal(mode = 'login') {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } }));
}

function resetProfileForm() {
  syncProfileForm({ clearSuccess: true });
}

function normalizeProfileLinks() {
  return (profileForm.value.profileLinks || [])
    .map((link) => ({ label: String(link?.label || '').trim(), url: String(link?.url || '').trim() }))
    .filter((link) => link.label && link.url);
}

function addProfileLink() {
  profileForm.value.profileLinks = [...profileForm.value.profileLinks, { label: '', url: '' }];
}

function removeProfileLink(index) {
  profileForm.value.profileLinks = profileForm.value.profileLinks.filter((_, itemIndex) => itemIndex !== index);
}

function buildProfilePayload(overrides = {}) {
  return {
    displayName: profileForm.value.displayName,
    city: profileForm.value.city,
    websiteUrl: profileForm.value.websiteUrl,
    bio: profileForm.value.bio,
    avatarUrl: profileForm.value.avatarUrl || null,
    coverImageUrl: profileForm.value.coverImageUrl || null,
    profileLinks: normalizeProfileLinks(),
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
</script>

<template>
  <main class="cabinet-page personal-cabinet">
    <div v-if="!bootstrapped && !isAuthenticated" class="message">Проверяем сохранённую сессию…</div>

    <section v-else-if="!isAuthenticated" class="dash-card personal-guest-panel">
      <h1>Личный кабинет</h1>
      <p>Для доступа к кабинету нужен вход в аккаунт.</p>
      <div class="inline-actions">
        <button class="btn btn-primary" type="button" @click="openAuthModal('login')">Войти</button>
        <button class="btn btn-outline" type="button" @click="openAuthModal('register')">Регистрация</button>
        <RouterLink class="btn btn-outline" to="/">На главную</RouterLink>
      </div>
    </section>

    <template v-else>
      <section class="cabinet-intro">
        <h1>Личный кабинет</h1>
        <p><b>Добро пожаловать, {{ displayName }}!</b> Управляйте профилем, произведениями и активностью на сайте.</p>
      </section>

      <section class="cabinet-top">
        <article class="dash-card actions-card">
          <h2>Быстрые действия</h2>
          <div>
            <a href="#publish-work">▤ <span>Добавить<br>произведение</span></a>
            <RouterLink :to="myWorksLink">▧ <span>Мои<br>публикации</span></RouterLink>
            <RouterLink to="/contests">♜ <span>Участвовать<br>в конкурсе</span></RouterLink>
            <RouterLink to="/messages">✉ <span>Мои<br>сообщения</span></RouterLink>
            <RouterLink v-if="currentUser?.login" :to="myAuthorPageLink">▥ <span>Страница<br>автора</span></RouterLink>
            <a href="#profile-edit">⚙ <span>Настройки<br>профиля</span></a>
          </div>
        </article>

        <article class="dash-card activity-card">
          <div class="card-heading"><h2>Активность</h2><RouterLink :to="myWorksLink">Подробнее</RouterLink></div>
          <div>
            <span><small>Регистрация</small><b>{{ formatDate(currentUser?.registeredAt || currentUser?.createdAt) }}</b></span>
            <span><small>Последний вход</small><b>{{ formatDateTime(currentUser?.lastLoginAt) }}</b></span>
            <span><small>Публикаций</small><b>{{ profile?.worksCountCached ?? 0 }}</b></span>
          </div>
          <p class="verified">✓ Подтверждён email<br>✓ Активный автор</p>
        </article>

        <article class="dash-card photo-card">
          <div class="card-heading"><h2>Фото автора</h2><a href="#profile-images">Изменить фото</a></div>
          <p>Фотография отображается на странице автора и в публикациях.</p>
          <div class="photos">
            <div>
              <img v-if="profileForm.avatarUrl" class="author-photo" :src="profileForm.avatarUrl" alt="Аватар автора">
              <div v-else class="author-photo author-photo-placeholder">{{ displayName.slice(0, 1).toUpperCase() }}</div>
              <b>Аватар</b><small>Изображение для публикаций и сообщений</small>
              <a class="btn btn-primary" href="#profile-images">Загрузить аватар</a>
            </div>
            <div>
              <img v-if="profileForm.coverImageUrl" class="cover-photo-image" :src="profileForm.coverImageUrl" alt="Обложка профиля">
              <div v-else class="cover-photo"></div>
              <b>Обложка профиля</b><small>Большое фото на странице автора</small>
              <a class="btn btn-secondary" href="#profile-images">Загрузить обложку</a>
            </div>
          </div>
        </article>
      </section>

      <section v-if="isAdmin || hasStoredOwnerSession" class="cabinet-managed-section">
        <article class="dash-card managed-authors-card">
          <div class="card-heading"><h2>Управляемые аккаунты</h2><span v-if="isAdmin">{{ managedAuthors.length }}</span></div>
          <p v-if="isAdmin">Переключитесь в профиль автора, чтобы размещать, редактировать и удалять материалы от его имени.</p>
          <p v-else>Вы работаете от имени автора. Вернитесь в админ-аккаунт, чтобы выбрать другой профиль.</p>
          <div v-if="managedSwitchStatus" class="message" :class="managedSwitchStatus.includes('Не удалось') ? 'error' : 'success'">{{ managedSwitchStatus }}</div>
          <div v-if="isAdmin">
            <p v-if="managedAuthorsBusy">Загружаем аккаунты…</p>
            <p v-else-if="managedAuthorsError" class="message error">{{ managedAuthorsError }}</p>
            <p v-else-if="!managedAuthors.length">Управляемых аккаунтов пока нет.</p>
            <div v-else class="managed-authors-list">
              <div v-for="author in managedAuthors" :key="author.id" class="managed-author-row">
                <span><b>{{ author.displayName }}</b><small>@{{ author.login }} · {{ author.worksCountCached || 0 }} произведений</small></span>
                <div class="inline-actions"><RouterLink class="btn btn-outline" :to="buildAuthorPageLocation(author)">Страница автора</RouterLink><button class="btn btn-primary" type="button" :disabled="authBusy" @click="switchManagedAuthor(author)">{{ authBusy ? 'Открываем…' : 'Работать от имени автора' }}</button></div>
              </div>
            </div>
          </div>
          <div v-else class="inline-actions"><button class="btn btn-primary" type="button" :disabled="authBusy" @click="returnToAdminAccount">{{ authBusy ? 'Возвращаем…' : 'Вернуться в админ-аккаунт' }}</button></div>
        </article>
      </section>

      <section class="cabinet-mid">
        <article class="dash-card quick-nav">
          <h2>Быстрая навигация</h2>
          <div class="cab-tabs">
            <RouterLink :to="myWorksLink">Мои произведения</RouterLink>
            <RouterLink to="/messages">Сообщения</RouterLink>
            <RouterLink to="/contests">Конкурсы</RouterLink>
            <RouterLink to="/forum">Сообщество</RouterLink>
            <RouterLink v-if="currentUser?.login" :to="myAuthorPageLink">Мой профиль</RouterLink>
          </div>
          <p>Быстрый переход к самым важным разделам кабинета.</p>
        </article>

        <article id="profile-edit" class="dash-card profile-edit-card">
          <div class="card-heading"><h2>Публичная информация</h2><a href="#profile-edit">Редактировать</a></div>
          <div v-if="profileError" class="message error">{{ profileError }}</div>
          <div v-if="profileSuccess" class="message success">{{ profileSuccess }}</div>
          <form class="cabinet-profile-form" @submit.prevent="submitProfile">
            <label>Отображаемое имя<input v-model="profileForm.displayName" required></label>
            <label>Город<input v-model="profileForm.city" placeholder="Например, Москва"></label>
            <label>Сайт<input v-model="profileForm.websiteUrl" placeholder="https://example.com"></label>
            <fieldset class="profile-links-editor">
              <legend>Кнопки-ссылки на другие ресурсы</legend>
              <p>Например: Telegram, VK, музыкальная площадка или личный сайт.</p>
              <div v-for="(link, index) in profileForm.profileLinks" :key="`profile-link-${index}`" class="profile-link-editor-row">
                <input v-model="link.label" placeholder="Подпись кнопки">
                <input v-model="link.url" type="url" placeholder="https://…">
                <button class="btn btn-outline" type="button" @click="removeProfileLink(index)">Удалить</button>
              </div>
              <button class="btn btn-outline" type="button" @click="addProfileLink">+ Добавить кнопку</button>
            </fieldset>
            <label class="profile-bio-field">О себе<textarea v-model="profileForm.bio" placeholder="Короткое описание автора"></textarea></label>
            <div class="inline-actions"><button class="btn btn-primary" type="submit" :disabled="profileBusy || profileImageBusy">{{ profileBusy ? 'Сохраняем…' : 'Сохранить' }}</button><button class="btn btn-outline" type="button" @click="resetProfileForm">Сбросить</button></div>
          </form>
        </article>
      </section>

      <section id="profile-images" class="cabinet-info">
        <article class="dash-card image-settings-card">
          <div class="card-heading"><h2>Настройки фото</h2><a href="#profile-images">Загрузить</a></div>
          <div v-if="profileImageError" class="message error">{{ profileImageError }}</div>
          <div v-if="profileImageSuccess" class="message success">{{ profileImageSuccess }}</div>
          <div class="profile-image-grid">
            <div class="profile-image-card"><b>Аватар</b><input ref="avatarFileInput" type="file" accept="image/*" @change="handleProfileImageChange('avatar', $event)"><button class="btn btn-primary" type="button" :disabled="profileImageBusy" @click="submitProfileImage('avatar')">Загрузить</button></div>
            <div class="profile-image-card"><b>Обложка</b><input ref="coverFileInput" type="file" accept="image/*" @change="handleProfileImageChange('cover', $event)"><button class="btn btn-secondary" type="button" :disabled="profileImageBusy" @click="submitProfileImage('cover')">Загрузить</button></div>
          </div>
        </article>
        <article class="dash-card stats-card"><div class="card-heading"><h2>Статистика писателя</h2><RouterLink :to="myWorksLink">Подробнее</RouterLink></div><div><span><small>Произведений</small><b>{{ profile?.worksCountCached ?? 0 }}</b></span><span><small>Рейтинг</small><b>{{ profile?.ratingTotal ?? 0 }}</b></span><span><small>В витрине</small><b>{{ profile?.isFeatured ? 'Да' : 'Нет' }}</b></span><span><small>Статус</small><b>{{ profile?.isClassic ? 'Классик' : 'Автор' }}</b></span></div></article>
        <article class="dash-card cabinet-ledger-card">
          <div class="card-heading"><h2>Рейтинг и персики</h2><b>{{ ratingTotal }} ★</b></div>
          <div class="cabinet-metrics"><span><small>Рейтинг</small><b>{{ ratingTotal }}</b></span><span><small>За этот месяц</small><b>+{{ ratingMonthPoints }}</b></span><span><small>Персиков</small><b>{{ peachBalance }}</b></span><span><small>Аудио-слотов</small><b>{{ audioUploadSlots }}</b></span></div>
          <div class="cabinet-ledger-actions"><button class="btn btn-outline" type="button" @click="ratingHistoryOpen = !ratingHistoryOpen">{{ ratingHistoryOpen ? 'Скрыть рейтинг' : 'История рейтинга' }}</button><button class="btn btn-outline" type="button" @click="peachHistoryOpen = !peachHistoryOpen">{{ peachHistoryOpen ? 'Скрыть операции' : 'История персиков' }}</button></div>
          <div v-if="ratingHistoryOpen" class="cabinet-ledger-list"><p v-if="ratingEventsBusy">Загружаем начисления…</p><p v-else-if="ratingEventsError" class="message error">{{ ratingEventsError }}</p><p v-else-if="!ratingEvents.length">Рейтинговых начислений пока нет.</p><div v-else v-for="event in ratingEvents" :key="event.id" class="cabinet-ledger-row"><span><b>{{ event.label }}</b><small>{{ formatDateTime(event.createdAt) }}</small></span><strong>+{{ event.points }}</strong></div></div>
          <div v-if="peachHistoryOpen" class="cabinet-ledger-list"><p v-if="peachTransactionsBusy">Загружаем операции…</p><p v-else-if="peachTransactionsError" class="message error">{{ peachTransactionsError }}</p><p v-else-if="!peachTransactions.length">Операций с персиками пока нет.</p><div v-else v-for="transaction in peachTransactions" :key="transaction.id" class="cabinet-ledger-row"><span><b>{{ transaction.note || transaction.kind }}</b><small>{{ formatDateTime(transaction.createdAt) }}</small></span><strong :class="{ 'is-negative': Number(transaction.amount) < 0 }">{{ Number(transaction.amount) > 0 ? '+' : '' }}{{ transaction.amount }}</strong></div></div>
          <div class="cabinet-peach-tools"><button class="btn btn-primary" type="button" :disabled="peachBusy" @click="purchaseAudioPack">{{ peachBusy ? 'Покупаем…' : '20 аудио-слотов за 100 персиков' }}</button><div v-if="peachStatus" class="message" :class="peachStatus.includes('куплен') ? 'success' : 'error'">{{ peachStatus }}</div><form class="cabinet-review-form" @submit.prevent="submitReviewRequest"><label>Заявка на рецензию<input v-model="reviewForm.title" required placeholder="Что нужно посмотреть"></label><label>Комментарий<textarea v-model="reviewForm.message" placeholder="Ссылка или пожелания"></textarea></label><button class="btn btn-outline" type="submit" :disabled="reviewBusy">{{ reviewBusy ? 'Отправляем…' : 'Заказать рецензию за 100 персиков' }}</button></form><div v-if="reviewStatus" class="message" :class="reviewStatus.includes('отправлена') ? 'success' : 'error'">{{ reviewStatus }}</div></div>
        </article>
        <article class="dash-card public-info"><div class="card-heading"><h2>Публичная информация</h2><RouterLink v-if="currentUser?.login" :to="myAuthorPageLink">Просмотреть</RouterLink></div><p><small>Псевдоним</small><b>{{ displayName }}</b></p><p><small>Город</small><b>{{ profile?.city || 'Не указан' }}</b></p><p><small>О себе</small><b>{{ profile?.bio || 'Пока без описания' }}</b></p></article>
        <article class="dash-card author-profile"><div class="card-heading"><h2>Профиль автора</h2><RouterLink v-if="currentUser?.login" :to="myAuthorPageLink">Открыть</RouterLink></div><p>Логин <b>@{{ currentUser?.login }}</b></p><p>Роль <b>{{ currentUser?.role || 'author' }}</b></p><p>Сайт <b>{{ profile?.websiteUrl || '—' }}</b></p></article>
      </section>

      <section class="cabinet-bottom">
        <article class="dash-card notifications"><div class="card-heading"><h2>Разделы автора</h2><RouterLink to="/messages">Сообщения</RouterLink></div><p><RouterLink to="/forum">▣ Сообщество и обсуждения</RouterLink></p><p><RouterLink to="/contests">♜ Литературные конкурсы</RouterLink></p><p><RouterLink to="/radio">◉ Радио Littop</RouterLink></p></article>
        <article class="dash-card publications"><div class="card-heading"><h2>Ваши публикации</h2><RouterLink :to="myWorksLink">Все публикации</RouterLink></div><p v-if="myWorksLoading">Загружаем публикации…</p><p v-else-if="!myRecentWorks.length">Публикаций пока нет. Добавьте первую работу.</p><div v-else><RouterLink v-for="work in myRecentWorks" :key="work.id" :to="buildWorkPageLocation(work)"><div class="publication-cover">{{ work.title.slice(0, 1).toUpperCase() }}</div><span><b>{{ work.title }}</b><small>{{ formatDate(work.publishedAt || work.createdAt) }} · ♡ {{ work.likesCount || 0 }}</small></span></RouterLink></div></article>
      </section>

      <section id="publish-work" class="cabinet-live-section"><div v-if="publishStatus" class="message success">{{ publishStatus }}</div><WorkPublishForm @created="handleWorkCreated" /></section>

      <section id="upload-audio" class="cabinet-live-section"><article class="dash-card"><div class="card-heading"><h2>Добавить аудио</h2><RouterLink to="/radio">Открыть радио</RouterLink></div><div v-if="audioError" class="message error">{{ audioError }}</div><div v-if="audioSuccess" class="message success">{{ audioSuccess }}</div><form class="cabinet-profile-form" @submit.prevent="submitAudio"><label>Название аудио<input v-model="audioForm.title" required placeholder="Например, Вечерний эфир"></label><label>Аудиофайл<input ref="audioFileInput" type="file" accept="audio/*" required @change="handleAudioFileChange"></label><div class="inline-actions"><button class="btn btn-primary" type="submit" :disabled="audioBusy">{{ audioBusy ? 'Загружаем…' : 'Загрузить аудио' }}</button><button class="btn btn-outline" type="button" @click="resetAudioForm">Сбросить</button></div></form></article></section>
    </template>
  </main>
</template>
