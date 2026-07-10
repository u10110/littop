<script setup>
import { computed, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';

import { RADIO_TRACKS_QUERY, DELETE_RADIO_TRACK_MUTATION } from '../lib/graphql.js';
import { formatDate, formatDuration, ratingLabel } from '../lib/format.js';

import RadioPlayer from './RadioPlayer.vue';
import { apolloClient } from '../lib/apollo.js';
import { useSession } from '../lib/session.js';

const { currentUser } = useSession();
const isAdmin = computed(() => currentUser.value?.role === 'admin');

const selectedTrackId = ref(null);

const { result, loading, error, refetch } = useQuery(RADIO_TRACKS_QUERY, {
  limit: 30,
  offset: 0,
}, {
  fetchPolicy: 'cache-and-network',
});

const tracks = computed(() => result.value?.radioTracks ?? []);
const selectedTrack = computed(() => tracks.value.find((item) => String(item.id) === String(selectedTrackId.value)) ?? null);

const canManageTrack = (track) => Boolean(isAdmin.value) || String(track.creatorUserId) === String(currentUser.value?.id);

async function deleteTrack(track) {
  if (!globalThis.confirm?.('Удалить этот аудиотрек?')) return;
  try {
    await apolloClient.mutate({ mutation: DELETE_RADIO_TRACK_MUTATION, variables: { id: track.id } });
    await refetch?.();
  } catch {
    // ошибка удаления трека
  }
}

watch(tracks, (items) => {
  if (!items.length) {
    selectedTrackId.value = null;
    return;
  }

  const stillExists = items.some((item) => String(item.id) === String(selectedTrackId.value));
  if (!stillExists) {
    selectedTrackId.value = items[0].id;
  }
}, { immediate: true });
</script>

<template>
  <section class="page-head">
    <h1>Радио</h1>
    <p class="muted">
      Здесь отображаются треки из <code>radioTracks</code> в backend. Аудио, загруженное из страницы «Мой кабинет»,
      после сохранения в папку и БД автоматически появляется в этом списке.
    </p>
  </section>

   <section class="player" aria-label="Проигрыватель">
      <RadioPlayer />
    </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="layout-columns">
    <div class="stack">
      <div class="section-head">
        <h2>Плейлист</h2>
        <span class="pill">{{ loading ? 'загрузка…' : `${tracks.length} треков` }}</span>
      </div>

      <div v-if="tracks.length" class="stack">
        <article
          v-for="track in tracks"
          :key="track.id"
          class="card clickable"
          :class="{ 'is-selected': String(track.id) === String(selectedTrackId) }"
          @click="selectedTrackId = track.id"
        >
          <h3>{{ track.title }}</h3>
          <div class="meta">{{ track.authorName || 'Автор не указан' }} · {{ formatDuration(track.durationSeconds) }}</div>
          <div class="meta">{{ ratingLabel(track.averageRating, track.ratingsCount) }}</div>
          <button
            v-if="canManageTrack(track)"
            class="btn btn-sm btn-danger track-delete"
            type="button"
            @click.stop="deleteTrack(track)"
          >Удалить</button>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">Треков пока нет. Компонент уже ждёт данные из radio_tracks без статических заглушек.</div>
    </div>

    <div class="stack">
      <article v-if="selectedTrack" class="panel stack">
        <div class="section-head">
          <h2>{{ selectedTrack.title }}</h2>
          <span class="pill">{{ formatDuration(selectedTrack.durationSeconds) }}</span>
        </div>
        <div class="meta">
          {{ selectedTrack.authorName || 'Автор не указан' }} · создано {{ formatDate(selectedTrack.createdAt) }}
        </div>
        <div class="chips">
          <span class="pill">{{ ratingLabel(selectedTrack.averageRating, selectedTrack.ratingsCount) }}</span>
          <a v-if="selectedTrack.sourceUrl" class="btn btn-outline" :href="selectedTrack.sourceUrl" target="_blank" rel="noreferrer">Источник</a>
        </div>

        <audio v-if="selectedTrack.audioUrl" controls preload="metadata" style="width: 100%;">
          <source :src="selectedTrack.audioUrl" type="audio/mpeg" />
          Ваш браузер не поддерживает аудио.
        </audio>
        <div v-else class="message">У этого трека пока нет прямого audioUrl, но его карточка уже приходит из backend.</div>
      </article>

      <div v-else class="empty-state">Выбери трек слева, чтобы открыть детальную карточку.</div>
    </div>
  </section>
</template>
