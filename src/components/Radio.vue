<script setup>
import { computed, ref, watch } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RADIO_TRACKS_QUERY } from '../lib/graphql.js';
import { formatDate, formatDuration, ratingLabel } from '../lib/format.js';

const selectedTrackId = ref(null);
const { result, loading, error } = useQuery(RADIO_TRACKS_QUERY, { limit: 30, offset: 0 }, { fetchPolicy: 'cache-and-network' });
const tracks = computed(() => result.value?.radioTracks ?? []);
const selectedTrack = computed(() => tracks.value.find((item) => String(item.id) === String(selectedTrackId.value)) ?? null);
watch(tracks, (items) => { if (!items.length) selectedTrackId.value = null; else if (!items.some((item) => String(item.id) === String(selectedTrackId.value))) selectedTrackId.value = items[0].id; }, { immediate: true });
function selectTrack(id) { selectedTrackId.value = id; }
</script>

<template>
  <main class="radio-ref"><section class="radio-shell"><header class="radio-hero"><div><span class="catalog-kicker">Аудиопроект Littop</span><h1>Радио</h1><p>Слушайте произведения и авторские записи. В эфире — реальные треки, опубликованные участниками сообщества.</p></div><span class="radio-total">{{ loading ? '…' : `${tracks.length} треков` }}</span></header>
    <p v-if="error" class="ref-error">Не удалось загрузить радио: {{ error.message }}</p><p v-else-if="loading && !result" class="ref-loading">Загружаем плейлист…</p>
    <section v-else-if="selectedTrack" class="radio-player"><div class="radio-disc">♫</div><div class="radio-now"><span>Сейчас играет</span><h2>{{ selectedTrack.title }}</h2><p>{{ selectedTrack.authorName || 'Автор не указан' }} · {{ formatDuration(selectedTrack.durationSeconds) }}</p><audio v-if="selectedTrack.audioUrl" controls preload="metadata"><source :src="selectedTrack.audioUrl" type="audio/mpeg">Ваш браузер не поддерживает аудио.</audio><p v-else class="radio-no-audio">Аудиофайл для этого трека пока не опубликован.</p></div><div class="radio-score">★ {{ ratingLabel(selectedTrack.averageRating, selectedTrack.ratingsCount) }}<small>добавлен {{ formatDate(selectedTrack.createdAt) }}</small></div></section>
    <section v-if="tracks.length" class="radio-body"><div><div class="section-title"><div><span class="catalog-kicker">Плейлист</span><h2>Все записи</h2></div></div><ol class="radio-playlist"><li v-for="(track,index) in tracks" :key="track.id" :class="{ active: String(track.id) === String(selectedTrackId) }" @click="selectTrack(track.id)"><b>{{ String(index + 1).padStart(2,'0') }}</b><button type="button" :aria-label="`Выбрать ${track.title}`">▶</button><div><strong>{{ track.title }}</strong><small>{{ track.authorName || 'Автор не указан' }}</small></div><span>{{ formatDuration(track.durationSeconds) }}</span><em>★ {{ ratingLabel(track.averageRating, track.ratingsCount) }}</em></li></ol></div><aside class="radio-side"><section><h2>О радио</h2><p>Записи появляются здесь после загрузки автором из личного кабинета. Мы не добавляем фиктивные треки или жанры.</p></section><section><h2>Выбранный трек</h2><p>{{ selectedTrack?.title || 'Выберите запись из плейлиста.' }}</p><a v-if="selectedTrack?.sourceUrl" :href="selectedTrack.sourceUrl" target="_blank" rel="noreferrer">Открыть источник →</a></section></aside></section>
    <section v-else-if="!loading" class="catalog-empty"><h2>Записей пока нет</h2><p>После первой публикации аудиотрека он появится в плейлисте.</p></section>
  </section></main>
</template>
