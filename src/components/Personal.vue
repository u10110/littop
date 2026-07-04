<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import JSZip from 'jszip';

import WorkPublishForm from './WorkPublishForm.vue';
import { useSession } from '../lib/session.js';
import { apolloClient } from '../lib/apollo.js';
import { formatBirthday, formatDate, formatDateTime } from '../lib/format.js';
import { filenameToTrackTitle, probeAudioDuration, uploadRadioTrack } from '../lib/radio.js';
import { uploadProfileImage } from '../lib/profileImages.js';
import { buildAuthorPageLocation } from '../lib/routes.js';
import {
  ADMIN_CREATE_MANAGED_AUTHOR_MUTATION,
  ADMIN_GRANT_PEACHES_MUTATION,
  ADMIN_UPDATE_AUTHOR_PAGE_FLAGS_MUTATION,
  MY_MANAGED_AUTHORS_QUERY,
  MY_PEACH_TRANSACTIONS_QUERY,
  MY_RATING_EVENTS_QUERY,
  PURCHASE_AUDIO_UPLOAD_PACK_MUTATION,
  REQUEST_ADMIN_REVIEW_MUTATION,
  WORKS_QUERY,
} from '../lib/graphql.js';
import { renderRichTextHtml, stripHtml } from '../lib/richText.js';

const {
  currentUser,
  isAuthenticated,
  bootstrapped,
  profileBusy,
  profileError,
  bootstrapSession,
  saveProfile,
  closeAccount,
  switchToManagedAuthor,
} = useSession();

const profile = computed(() => currentUser.value?.profile ?? null);
const isAdmin = computed(() => currentUser.value?.role === 'admin');
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
const archiveBusy = ref(false);
const archiveStatus = ref('');
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
  coverImagePositionX: 50,
  coverImagePositionY: 50,
  coverImageScale: 1,
  profileLinks: [],
  birthDate: '',
});
const managedAuthors = ref([]);
const ratingEvents = ref([]);
const peachTransactions = ref([]);
const peachBalance = ref(0);
const audioUploadSlots = ref(0);
const managedBusy = ref(false);
const managedStatus = ref('');
const managedAuthorForm = ref({
  login: '',
  displayName: '',
  bio: '',
  city: '',
  websiteUrl: '',
  birthDate: '',
});
const audioForm = ref({
  title: '',
  file: null,
});
const peachBusy = ref(false);
const peachStatus = ref('');
const reviewBusy = ref(false);
const reviewStatus = ref('');
const reviewForm = ref({
  title: '',
  message: '',
});
const adminGrantForm = ref({
  login: '',
  amount: 100,
  note: '',
});

onMounted(async () => {
  await bootstrapSession();
  await loadExtraCabinetData();
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
    coverImagePositionX: Number(currentUser.value?.profile?.coverImagePositionX ?? 50),
    coverImagePositionY: Number(currentUser.value?.profile?.coverImagePositionY ?? 50),
    coverImageScale: Number(currentUser.value?.profile?.coverImageScale ?? 1),
    profileLinks: Array.isArray(currentUser.value?.profile?.profileLinks) ? currentUser.value.profile.profileLinks.map((item) => ({ label: item.label || '', url: item.url || '' })) : [],
    birthDate: currentUser.value?.profile?.birthDate || '',
  };
  peachBalance.value = Number(currentUser.value?.profile?.peachBalance ?? 0);
  audioUploadSlots.value = Number(currentUser.value?.profile?.audioUploadSlots ?? 0);
}

const coverPreviewStyle = computed(() => ({
  objectPosition: `${Number(profileForm.value.coverImagePositionX ?? 50)}% ${Number(profileForm.value.coverImagePositionY ?? 50)}%`,
  transform: `scale(${Number(profileForm.value.coverImageScale ?? 1)})`,
}));

function normalizeProfileLinks() {
  return (Array.isArray(profileForm.value.profileLinks) ? profileForm.value.profileLinks : [])
    .map((item) => ({ label: String(item?.label || '').trim(), url: String(item?.url || '').trim() }))
    .filter((item) => item.label && item.url);
}

function addProfileLink() {
  profileForm.value.profileLinks = [...(profileForm.value.profileLinks || []), { label: '', url: '' }];
}

function removeProfileLink(index) {
  profileForm.value.profileLinks = (profileForm.value.profileLinks || []).filter((_, idx) => idx !== index);
}

async function loadExtraCabinetData() {
  if (!isAuthenticated.value) {
    managedAuthors.value = [];
    ratingEvents.value = [];
    peachTransactions.value = [];
    return;
  }
  try {
    const [{ data: ratingData }, { data: peachData }, managedResult] = await Promise.all([
      apolloClient.query({ query: MY_RATING_EVENTS_QUERY, variables: { limit: 100 }, fetchPolicy: 'network-only' }),
      apolloClient.query({ query: MY_PEACH_TRANSACTIONS_QUERY, variables: { limit: 100 }, fetchPolicy: 'network-only' }),
      isAdmin.value
        ? apolloClient.query({ query: MY_MANAGED_AUTHORS_QUERY, variables: { limit: 100 }, fetchPolicy: 'network-only' })
        : Promise.resolve({ data: { myManagedAuthors: [] } }),
    ]);
    ratingEvents.value = ratingData?.myRatingEvents ?? [];
    peachTransactions.value = peachData?.myPeachTransactions ?? [];
    managedAuthors.value = managedResult?.data?.myManagedAuthors ?? [];
  } catch {
    // Не роняем кабинет, если дополнительные блоки временно недоступны.
  }
}

watch(
  currentUser,
  async () => {
    syncProfileForm();
    await loadExtraCabinetData();
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
    coverImagePositionX: Number(profileForm.value.coverImagePositionX ?? 50),
    coverImagePositionY: Number(profileForm.value.coverImagePositionY ?? 50),
    coverImageScale: Number(profileForm.value.coverImageScale ?? 1),
    profileLinks: normalizeProfileLinks(),
    birthDate: profileForm.value.birthDate || null,
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
    audioUploadSlots.value = Math.max(0, audioUploadSlots.value - 1);
    resetAudioForm();
    audioSuccess.value = `Аудио${title} загружено. Оно уже доступно на странице «Радио».`;
    await loadExtraCabinetData();
  } catch (error) {
    audioError.value = error instanceof Error ? error.message : 'Не удалось загрузить аудио.';
  } finally {
    audioBusy.value = false;
  }
}

async function purchaseAudioPack() {
  peachBusy.value = true;
  peachStatus.value = '';
  try {
    const { data } = await apolloClient.mutate({ mutation: PURCHASE_AUDIO_UPLOAD_PACK_MUTATION });
    peachBalance.value = Number(data?.purchaseAudioUploadPack?.profile?.peachBalance ?? peachBalance.value - 100);
    audioUploadSlots.value = Number(data?.purchaseAudioUploadPack?.profile?.audioUploadSlots ?? audioUploadSlots.value + 20);
    peachStatus.value = 'Пакет куплен: +20 загрузок аудио.';
    await loadExtraCabinetData();
  } catch (error) {
    peachStatus.value = error instanceof Error ? error.message : 'Не удалось купить пакет аудио.';
  } finally {
    peachBusy.value = false;
  }
}

async function submitReviewRequest() {
  reviewBusy.value = true;
  reviewStatus.value = '';
  try {
    await apolloClient.mutate({
      mutation: REQUEST_ADMIN_REVIEW_MUTATION,
      variables: {
        title: reviewForm.value.title,
        message: reviewForm.value.message || null,
        workId: null,
      },
    });
    peachBalance.value = Math.max(0, peachBalance.value - 100);
    reviewForm.value = { title: '', message: '' };
    reviewStatus.value = 'Заявка на рецензию отправлена администрации.';
    await loadExtraCabinetData();
  } catch (error) {
    reviewStatus.value = error instanceof Error ? error.message : 'Не удалось отправить заявку на рецензию.';
  } finally {
    reviewBusy.value = false;
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


async function submitManagedAuthor() {
  managedBusy.value = true;
  managedStatus.value = '';
  try {
    await apolloClient.mutate({
      mutation: ADMIN_CREATE_MANAGED_AUTHOR_MUTATION,
      variables: {
        input: {
          login: managedAuthorForm.value.login,
          displayName: managedAuthorForm.value.displayName,
          bio: managedAuthorForm.value.bio || null,
          city: managedAuthorForm.value.city || null,
          websiteUrl: managedAuthorForm.value.websiteUrl || null,
          birthDate: managedAuthorForm.value.birthDate || null,
        },
      },
    });
    managedAuthorForm.value = { login: '', displayName: '', bio: '', city: '', websiteUrl: '', birthDate: '' };
    managedStatus.value = 'Управляемый аккаунт создан.';
    await loadExtraCabinetData();
  } catch (error) {
    managedStatus.value = error instanceof Error ? error.message : 'Не удалось создать управляемый аккаунт.';
  } finally {
    managedBusy.value = false;
  }
}

async function switchManaged(authorId) {
  managedBusy.value = true;
  managedStatus.value = '';
  try {
    await switchToManagedAuthor(authorId);
    managedStatus.value = 'Переключение выполнено.';
    await loadExtraCabinetData();
  } catch (error) {
    managedStatus.value = error instanceof Error ? error.message : 'Не удалось переключить аккаунт.';
  } finally {
    managedBusy.value = false;
  }
}

async function setManagedAuthorFlag(author, patch) {
  if (!author?.id) return;
  managedBusy.value = true;
  managedStatus.value = '';
  try {
    await apolloClient.mutate({
      mutation: ADMIN_UPDATE_AUTHOR_PAGE_FLAGS_MUTATION,
      variables: {
        authorId: author.id,
        isClassic: Boolean(patch.isClassic ?? author.isClassic),
        isMemorialPage: Boolean(patch.isMemorialPage ?? author.isMemorialPage),
      },
    });
    managedStatus.value = 'Статус управляемого аккаунта обновлён.';
    await loadExtraCabinetData();
  } catch (error) {
    managedStatus.value = error instanceof Error ? error.message : 'Не удалось обновить статус аккаунта.';
  } finally {
    managedBusy.value = false;
  }
}

async function submitAdminGrantPeaches() {
  peachBusy.value = true;
  peachStatus.value = '';
  try {
    await apolloClient.mutate({
      mutation: ADMIN_GRANT_PEACHES_MUTATION,
      variables: {
        login: adminGrantForm.value.login,
        amount: Number(adminGrantForm.value.amount),
        note: adminGrantForm.value.note || null,
      },
    });
    peachStatus.value = 'Персики начислены.';
    adminGrantForm.value = { login: '', amount: 100, note: '' };
  } catch (error) {
    peachStatus.value = error instanceof Error ? error.message : 'Не удалось начислить персики.';
  } finally {
    peachBusy.value = false;
  }
}

function sanitizeArchiveFileName(value, fallback = 'work') {
  const normalized = String(value ?? '').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ');
  return normalized || fallback;
}

function buildWorkArchiveHtml(work) {
  const rendered = renderRichTextHtml(work?.body || work?.summary || work?.excerpt || '');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${work.title}</title></head><body><h1>${work.title}</h1><div>${rendered || '<p>Текст не добавлен.</p>'}</div></body></html>`;
}

async function downloadWorksArchive() {
  if (!currentUser.value?.id) return;
  archiveBusy.value = true;
  archiveStatus.value = '';
  try {
    const { data } = await apolloClient.query({
      query: WORKS_QUERY,
      variables: { limit: 500, offset: 0, authorId: currentUser.value.id, sectionCode: null, search: null },
      fetchPolicy: 'network-only',
    });
    const works = data?.works ?? [];
    const zip = new JSZip();
    const folder = zip.folder('works');
    works.forEach((work, index) => {
      const baseName = `${String(index + 1).padStart(2, '0')}-${sanitizeArchiveFileName(work.title, `work-${index + 1}`)}`;
      folder.file(`${baseName}.txt`, stripHtml(work.body || work.summary || work.excerpt || ''));
      folder.file(`${baseName}.html`, buildWorkArchiveHtml(work));
    });
    zip.file('manifest.json', JSON.stringify({
      author: currentUser.value.login,
      exportedAt: new Date().toISOString(),
      works: works.map((work) => ({ id: work.id, title: work.title, slug: work.slug, sectionCode: work.sectionCode })),
    }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `littop-${sanitizeArchiveFileName(currentUser.value.login, 'author')}-works.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    archiveStatus.value = works.length ? `Архив из ${works.length} произведений готов.` : 'Архив создан, но опубликованных произведений пока нет.';
  } catch (error) {
    archiveStatus.value = error instanceof Error ? error.message : 'Не удалось собрать архив произведений.';
  } finally {
    archiveBusy.value = false;
  }
}

async function submitAccountClosure() {  const confirmed = globalThis.confirm?.('Закрыть аккаунт автора? Публикации будут сняты с витрины, а сессия завершится.') ?? true;
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
        <article class="card stat">
          <span class="meta">Персики</span>
          <span class="value">{{ peachBalance }}</span>
          <span class="note">Внутренняя валюта сайта</span>
        </article>
        <article class="card stat">
          <span class="meta">Аудио-слоты</span>
          <span class="value">{{ audioUploadSlots }}</span>
          <span class="note">Осталось загрузок</span>
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
              <div class="meta">День рождения</div>
              <strong>{{ profile?.birthDate ? formatBirthday(profile.birthDate) : 'Не указан' }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Сайт</div>
              <strong>{{ profile?.websiteUrl || 'Не указан' }}</strong>
            </div>
            <div class="inline-card">
              <div class="meta">Кнопки-ссылки</div>
              <div>{{ (profile?.profileLinks?.length || 0) ? profile.profileLinks.map((item) => item.label).join(', ') : 'Не добавлены' }}</div>
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
              <label for="profile-birthday">День рождения</label>
              <input id="profile-birthday" v-model="profileForm.birthDate" class="input" type="date" />
            </div>

            <div class="field">
              <label for="profile-website">Сайт</label>
              <input id="profile-website" v-model="profileForm.websiteUrl" class="input" placeholder="https://example.com" />
            </div>

            <div class="field">
              <label>Дополнительные кнопки-ссылки</label>
              <div class="stack compact-stack">
                <div v-for="(link, index) in profileForm.profileLinks" :key="`profile-link-${index}`" class="grid-2">
                  <input v-model="link.label" class="input" placeholder="Подпись кнопки" />
                  <div class="inline-actions">
                    <input v-model="link.url" class="input" placeholder="https://..." />
                    <button class="btn btn-outline" type="button" @click="removeProfileLink(index)">Удалить</button>
                  </div>
                </div>
                <button class="btn btn-outline" type="button" @click="addProfileLink">Добавить кнопку</button>
              </div>
            </div>

            <div class="field">
              <label>Положение и масштаб верхней картинки</label>
              <div class="grid-3">
                <input v-model.number="profileForm.coverImagePositionX" class="input" type="number" min="0" max="100" step="1" placeholder="X %" />
                <input v-model.number="profileForm.coverImagePositionY" class="input" type="number" min="0" max="100" step="1" placeholder="Y %" />
                <input v-model.number="profileForm.coverImageScale" class="input" type="number" min="0.5" max="3" step="0.1" placeholder="Scale" />
              </div>
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
                <img v-if="profileForm.coverImageUrl" :src="profileForm.coverImageUrl" :style="coverPreviewStyle" class="profile-image-preview-img profile-image-preview-img-cover" alt="Большое фото автора" />
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
              <div class="meta">Последний визит</div>
              <strong>{{ formatDateTime(currentUser?.lastSeenAt) }}</strong>
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
            <RouterLink class="btn btn-outline" to="/messages">Личные сообщения</RouterLink>
            <button class="btn btn-outline" type="button" :disabled="archiveBusy" @click="downloadWorksArchive">{{ archiveBusy ? 'Собираем архив…' : 'Скачать произведения архивом' }}</button>
          </div>
          <div class="note">
            Кнопка «Мои произведения» открывает каталог сразу с фильтром <code>?mine=1</code> из адресной строки.
          </div>
          <div v-if="archiveStatus" class="message" :class="archiveStatus.includes('готов') || archiveStatus.includes('создан') ? 'success' : 'error'">{{ archiveStatus }}</div>
        </article>
      </section>

      <section class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Рейтинговые начисления</h2>
            <span class="pill">{{ ratingEvents.length }} событий</span>
          </div>
          <div v-if="ratingEvents.length" class="stack">
            <div v-for="event in ratingEvents" :key="event.id" class="inline-card">
              <div class="section-head">
                <strong>{{ event.label }}</strong>
                <span class="pill good">+{{ event.points }}</span>
              </div>
              <div class="meta">{{ formatDateTime(event.createdAt) }}</div>
            </div>
          </div>
          <div v-else class="empty-state">Начислений пока нет.</div>
        </article>

        <article class="panel stack">
          <div class="section-head">
            <h2>Персики</h2>
            <span class="pill">баланс: {{ peachBalance }}</span>
          </div>
          <div class="note">
            За 100 персиков можно купить пакет из 20 загрузок аудио или отправить заявку на рецензию администрации.
          </div>
          <div class="chips">
            <span class="pill">аудио-слотов: {{ audioUploadSlots }}</span>
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="button" :disabled="peachBusy" @click="purchaseAudioPack">
              {{ peachBusy ? 'Покупаем…' : 'Купить 20 аудио-слотов за 100 персиков' }}
            </button>
          </div>
          <form class="stack" @submit.prevent="submitReviewRequest">
            <div class="field">
              <label for="review-title">Заявка на рецензию</label>
              <input id="review-title" v-model="reviewForm.title" class="input" required placeholder="Что нужно посмотреть" />
            </div>
            <div class="field">
              <label for="review-message">Комментарий</label>
              <textarea id="review-message" v-model="reviewForm.message" class="textarea" placeholder="Ссылка на произведение, пожелания и т.п." />
            </div>
            <div class="inline-actions">
              <button class="btn btn-outline" type="submit" :disabled="reviewBusy">{{ reviewBusy ? 'Отправляем…' : 'Заказать рецензию за 100 персиков' }}</button>
            </div>
          </form>
          <div v-if="peachStatus" class="message" :class="peachStatus.includes('куплен') || peachStatus.includes('начислены') ? 'success' : 'error'">{{ peachStatus }}</div>
          <div v-if="reviewStatus" class="message" :class="reviewStatus.includes('отправлена') ? 'success' : 'error'">{{ reviewStatus }}</div>
          <div v-if="peachTransactions.length" class="stack">
            <div v-for="transaction in peachTransactions" :key="transaction.id" class="inline-card">
              <div class="section-head">
                <strong>{{ transaction.note || transaction.kind }}</strong>
                <span class="pill" :class="transaction.amount >= 0 ? 'good' : 'warn'">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</span>
              </div>
              <div class="meta">{{ formatDateTime(transaction.createdAt) }}</div>
            </div>
          </div>
          <div v-else class="empty-state">История персиков пока пуста.</div>
        </article>
      </section>

      <section v-if="isAdmin" class="layout-columns personal-layout">
        <article class="panel">
          <div class="section-head">
            <h2>Управляемые аккаунты</h2>
            <span class="pill">{{ managedAuthors.length }} профилей</span>
          </div>
          <div class="note">Владелец сайта может создавать специальные авторские аккаунты без выхода из своего профиля, переключаться между ними и помечать их как классиков или страницы памяти.</div>
          <form class="stack" @submit.prevent="submitManagedAuthor">
            <div class="grid-2">
              <div class="field">
                <label>Логин</label>
                <input v-model="managedAuthorForm.login" class="input" required />
              </div>
              <div class="field">
                <label>Имя автора</label>
                <input v-model="managedAuthorForm.displayName" class="input" required />
              </div>
              <div class="field">
                <label>Город</label>
                <input v-model="managedAuthorForm.city" class="input" />
              </div>
              <div class="field">
                <label>День рождения</label>
                <input v-model="managedAuthorForm.birthDate" class="input" type="date" />
              </div>
              <div class="field">
                <label>Сайт</label>
                <input v-model="managedAuthorForm.websiteUrl" class="input" />
              </div>
              <div class="field">
                <label>О себе</label>
                <textarea v-model="managedAuthorForm.bio" class="textarea"></textarea>
              </div>
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="managedBusy">{{ managedBusy ? 'Создаём…' : 'Создать управляемый аккаунт' }}</button>
            </div>
            <div v-if="managedStatus" class="message" :class="managedStatus.includes('создан') || managedStatus.includes('выполнено') || managedStatus.includes('обновлён') ? 'success' : 'error'">{{ managedStatus }}</div>
          </form>
          <div v-if="managedAuthors.length" class="stack">
            <div v-for="author in managedAuthors" :key="author.id" class="inline-card stack">
              <div class="section-head">
                <div>
                  <strong>{{ author.displayName }}</strong>
                  <div class="meta">@{{ author.login }}</div>
                </div>
                <button class="btn btn-outline" type="button" :disabled="managedBusy" @click="switchManaged(author.id)">Переключиться</button>
              </div>
              <div class="chips">
                <span v-if="author.isClassic" class="pill warn">классик</span>
                <span v-if="author.isMemorialPage" class="pill">страница памяти</span>
                <span class="pill">персики: {{ author.peachBalance ?? 0 }}</span>
                <span class="pill">аудио-слоты: {{ author.audioUploadSlots ?? 0 }}</span>
              </div>
              <div class="inline-actions">
                <RouterLink class="btn btn-outline" :to="buildAuthorPageLocation(author)">Страница автора</RouterLink>
                <button class="btn btn-outline" type="button" :disabled="managedBusy" @click="setManagedAuthorFlag(author, { isClassic: !author.isClassic })">
                  {{ author.isClassic ? 'Снять «Классик»' : 'Сделать классиком' }}
                </button>
                <button class="btn btn-outline" type="button" :disabled="managedBusy" @click="setManagedAuthorFlag(author, { isMemorialPage: !author.isMemorialPage })">
                  {{ author.isMemorialPage ? 'Снять «Память»' : 'Сделать страницей памяти' }}
                </button>
              </div>
            </div>
          </div>
        </article>

        <article class="panel stack">
          <div class="section-head">
            <h2>Начислить персики</h2>
            <span class="pill">админ</span>
          </div>
          <form class="stack" @submit.prevent="submitAdminGrantPeaches">
            <div class="field">
              <label for="grant-login">Логин</label>
              <input id="grant-login" v-model="adminGrantForm.login" class="input" required placeholder="login" />
            </div>
            <div class="field">
              <label for="grant-amount">Сколько персиков</label>
              <input id="grant-amount" v-model.number="adminGrantForm.amount" class="input" type="number" min="1" required />
            </div>
            <div class="field">
              <label for="grant-note">Комментарий</label>
              <textarea id="grant-note" v-model="adminGrantForm.note" class="textarea" placeholder="За что начисление" />
            </div>
            <div class="inline-actions">
              <button class="btn btn-primary" type="submit" :disabled="peachBusy">{{ peachBusy ? 'Начисляем…' : 'Начислить' }}</button>
            </div>
          </form>
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
            В течение первого года после закрытия аккаунт можно будет открыть снова через форму входа.
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
            появляется на странице «Радио». Один слот = одна загрузка. Остаток слотов: <strong>{{ audioUploadSlots }}</strong>.
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
              <button class="btn btn-primary" type="submit" :disabled="audioBusy || audioUploadSlots <= 0">
                {{ audioBusy ? 'Загружаем…' : 'Загрузить аудио' }}
              </button>
              <button class="btn btn-outline" type="button" :disabled="audioBusy" @click="resetAudioForm">
                Сбросить
              </button>
              <button class="btn btn-outline" type="button" :disabled="peachBusy" @click="purchaseAudioPack">
                Купить ещё 20 слотов
              </button>
              <RouterLink class="btn btn-outline" to="/radio">Открыть радио</RouterLink>
            </div>
            <div v-if="audioUploadSlots <= 0" class="message">Чтобы загрузить аудио, сначала купи пакет из 20 слотов за 100 персиков.</div>
          </form>
        </article>
      </section>
    </template>
  </section>
</template>
