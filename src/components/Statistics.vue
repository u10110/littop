<template>
  <div class="personal-page">
    <section class="section-block">
      <div class="section-head">
        <h1>Статистика</h1>
        <RouterLink class="btn btn-outline" to="/personal">В кабинет</RouterLink>
      </div>
      <p class="note">Суммарные начисления рейтинга и история персиков. За текущий месяц — подробный список, за прошлые периоды — выбирайте месяц в календаре.</p>

      <div v-if="loading" class="empty-state">Загружаем статистику…</div>
      <div v-if="error" class="message error">{{ error }}</div>

      <div v-if="!loading" class="stat-summary">
        <div class="stat-card">
          <div class="stat-card-value good">+{{ totalRating }}</div>
          <div class="stat-card-label">всего рейтинга</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" :class="totalPeachDelta >= 0 ? 'good' : 'warn'">{{ totalPeachDelta > 0 ? '+' : '' }}{{ totalPeachDelta }}</div>
          <div class="stat-card-label">всего персиков (приход − расход)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ ratingEvents.length }}</div>
          <div class="stat-card-label">событий рейтинга</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ peachTransactions.length }}</div>
          <div class="stat-card-label">операций с персиками</div>
        </div>
      </div>

      <div v-if="!loading" class="filter-row" style="margin-top: 1.5rem;">
        <label>Месяц:</label>
        <VueDatePicker v-model="month" :enable-time-picker="false" auto-apply :locale="ru" format="MMMM yyyy" />
        <span class="pill good">+{{ monthRating }} рейтинга</span>
        <span class="pill" :class="monthPeachDelta >= 0 ? 'good' : 'warn'">{{ monthPeachDelta > 0 ? '+' : '' }}{{ monthPeachDelta }} персиков</span>
      </div>

      <div v-if="!loading && (ratingMonthList.length || peachMonthList.length)" class="layout-columns personal-layout" style="margin-top: 1rem;">
        <article class="panel">
          <div class="section-head">
            <h2>Рейтинг за {{ monthLabel(month) }}</h2>
            <span class="pill">{{ ratingMonthList.length }}</span>
          </div>
          <div v-if="ratingMonthList.length" class="stack">
            <div v-for="event in ratingMonthList" :key="event.id" class="inline-card">
              <div class="section-head">
                <strong>{{ event.label }}</strong>
                <span class="pill good">+{{ event.points }}</span>
              </div>
              <div class="meta">{{ formatDateTime(event.createdAt) }}</div>
            </div>
          </div>
          <div v-else class="empty-state">Нет начислений за {{ monthLabel(month) }}.</div>
        </article>

        <article class="panel">
          <div class="section-head">
            <h2>Персики за {{ monthLabel(month) }}</h2>
            <span class="pill">{{ peachMonthList.length }}</span>
          </div>
          <div v-if="peachMonthList.length" class="stack">
            <div v-for="transaction in peachMonthList" :key="transaction.id" class="inline-card">
              <div class="section-head">
                <strong>{{ transaction.note || transaction.kind }}</strong>
                <span class="pill" :class="transaction.amount >= 0 ? 'good' : 'warn'">{{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}</span>
              </div>
              <div class="meta">{{ formatDateTime(transaction.createdAt) }}</div>
            </div>
          </div>
          <div v-else class="empty-state">Нет операций за {{ monthLabel(month) }}.</div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { ru } from 'date-fns/locale';
import { startOfMonth, isSameMonth, format as formatMonth, parseISO } from 'date-fns';
import { apolloClient } from '../lib/apollo.js';
import { MY_RATING_EVENTS_QUERY, MY_PEACH_TRANSACTIONS_QUERY } from '../lib/graphql.js';

const ratingEvents = ref([]);
const peachTransactions = ref([]);
const month = ref(startOfMonth(new Date()));
const loading = ref(true);
const error = ref('');

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    return formatMonth(parseISO(iso), 'd MMMM yyyy, HH:mm', { locale: ru });
  } catch {
    return iso;
  }
}
function monthLabel(monthDate) {
  return formatMonth(monthDate, 'LLLL yyyy', { locale: ru });
}
function inMonth(iso, monthDate) {
  if (!iso) return false;
  try {
    return isSameMonth(parseISO(iso), monthDate);
  } catch {
    return false;
  }
}

const totalRating = computed(() => ratingEvents.value.reduce((sum, e) => sum + (Number(e.points) || 0), 0));
const totalPeachDelta = computed(() => peachTransactions.value.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));

const ratingMonthList = computed(() => ratingEvents.value.filter((e) => inMonth(e.createdAt, month.value)));
const peachMonthList = computed(() => peachTransactions.value.filter((t) => inMonth(t.createdAt, month.value)));
const monthRating = computed(() => ratingMonthList.value.reduce((sum, e) => sum + (Number(e.points) || 0), 0));
const monthPeachDelta = computed(() => peachMonthList.value.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const [{ data: ratingData }, { data: peachData }] = await Promise.all([
      apolloClient.query({ query: MY_RATING_EVENTS_QUERY, variables: { limit: 500 }, fetchPolicy: 'network-only' }),
      apolloClient.query({ query: MY_PEACH_TRANSACTIONS_QUERY, variables: { limit: 500 }, fetchPolicy: 'network-only' }),
    ]);
    ratingEvents.value = ratingData?.myRatingEvents ?? [];
    peachTransactions.value = peachData?.myPeachTransactions ?? [];
  } catch (e) {
    error.value = 'Не удалось загрузить статистику: ' + (e?.message || e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.stat-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.stat-card {
  border: 1px solid var(--border, #e2e2e2);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: var(--surface, #fff);
}
.stat-card-value {
  font-size: 1.6rem;
  font-weight: 700;
}
.stat-card-label {
  color: var(--muted, #777);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.good { color: #2e7d32; }
.warn { color: #c0392b; }
.filter-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
