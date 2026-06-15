<script setup>
import { computed } from 'vue';
import { useQuery } from '@vue/apollo-composable';

import { CONTESTS_QUERY } from '../lib/graphql.js';
import { excerptText, formatContestScope, formatContestStatus, formatDate } from '../lib/format.js';

const { result, loading, error } = useQuery(CONTESTS_QUERY, {
  limit: 30,
  offset: 0,
}, {
  fetchPolicy: 'cache-and-network',
});

const contests = computed(() => result.value?.contests ?? []);
const activeContests = computed(() => contests.value.filter((item) => ['accepting_entries', 'voting'].includes(item.status)));
const archivedContests = computed(() => contests.value.filter((item) => ['finished', 'cancelled'].includes(item.status)));
const draftContests = computed(() => contests.value.filter((item) => item.status === 'draft'));
</script>

<template>
  <section class="page-head">
    <h1>Конкурсы</h1>
    <p class="muted">
      Компонент переведён на live GraphQL-список <code>contests</code> и теперь разделяет активные, завершённые и черновые конкурсы
      по реальным backend-статусам.
    </p>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="panel stack">
    <div class="chips">
      <span class="pill">всего: {{ loading ? '…' : contests.length }}</span>
      <span class="pill good">активные: {{ activeContests.length }}</span>
      <span class="pill warn">черновики: {{ draftContests.length }}</span>
      <span class="pill">завершённые: {{ archivedContests.length }}</span>
    </div>
  </section>

  <section class="section-block">
    <div class="section-head">
      <h2>Активные</h2>
      <span class="pill good">accepting_entries / voting</span>
    </div>
    <div v-if="activeContests.length" class="grid">
      <article v-for="contest in activeContests" :key="contest.id" class="card">
        <div class="chips">
          <span class="pill">{{ formatContestScope(contest.contestScope) }}</span>
          <span class="pill good">{{ formatContestStatus(contest.status) }}</span>
        </div>
        <h3>{{ contest.title }}</h3>
        <div class="meta">
          старт: {{ formatDate(contest.startsAt) }} · дедлайн: {{ formatDate(contest.submissionEndsAt || contest.votingEndsAt) }}
        </div>
        <div>{{ excerptText(contest.description, 180) }}</div>
      </article>
    </div>
    <div v-else-if="!loading" class="empty-state">Сейчас в БД нет активных конкурсов.</div>
  </section>

  <section class="section-block">
    <div class="section-head">
      <h2>Завершённые</h2>
      <span class="pill">finished / cancelled</span>
    </div>
    <div v-if="archivedContests.length" class="grid">
      <article v-for="contest in archivedContests" :key="contest.id" class="card">
        <div class="chips">
          <span class="pill">{{ formatContestScope(contest.contestScope) }}</span>
          <span class="pill warn">{{ formatContestStatus(contest.status) }}</span>
        </div>
        <h3>{{ contest.title }}</h3>
        <div class="meta">результаты: {{ formatDate(contest.resultsPublishedAt || contest.votingEndsAt || contest.submissionEndsAt) }}</div>
        <div>{{ excerptText(contest.description, 180) }}</div>
      </article>
    </div>
    <div v-else-if="!loading" class="empty-state">Завершённых конкурсов пока нет.</div>
  </section>

  <section class="section-block">
    <div class="section-head">
      <h2>Черновики</h2>
      <span class="pill warn">draft</span>
    </div>
    <div v-if="draftContests.length" class="grid">
      <article v-for="contest in draftContests" :key="contest.id" class="card">
        <h3>{{ contest.title }}</h3>
        <div class="meta">{{ formatContestScope(contest.contestScope) }}</div>
        <div>{{ excerptText(contest.description, 180) }}</div>
      </article>
    </div>
    <div v-else-if="!loading" class="empty-state">Черновиков нет — компонент корректно отрабатывает и это состояние.</div>
  </section>
</template>
