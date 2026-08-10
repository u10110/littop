<script setup>
import { computed, ref } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { CONTESTS_QUERY } from '../lib/graphql.js';
import { excerptText, formatContestScope, formatContestStatus, formatDate } from '../lib/format.js';

const activeTab = ref('active');
const { result, loading, error } = useQuery(CONTESTS_QUERY, { limit: 30, offset: 0 }, { fetchPolicy: 'cache-and-network' });
const contests = computed(() => result.value?.contests ?? []);
const activeContests = computed(() => contests.value.filter((item) => ['accepting_entries', 'voting'].includes(item.status)));
const archivedContests = computed(() => contests.value.filter((item) => ['finished', 'cancelled'].includes(item.status)));
const draftContests = computed(() => contests.value.filter((item) => item.status === 'draft'));
const displayedContests = computed(() => ({ active: activeContests.value, archived: archivedContests.value, drafts: draftContests.value })[activeTab.value]);
const tabLabel = computed(() => ({ active: 'Активные конкурсы', archived: 'Завершённые конкурсы', drafts: 'Черновики' })[activeTab.value]);
function deadline(contest) { return contest.submissionEndsAt || contest.votingEndsAt || contest.resultsPublishedAt || contest.startsAt; }
</script>

<template>
  <main class="contests-ref">
    <section class="contests-shell">
      <header class="contests-hero"><div><span class="catalog-kicker">Творческие возможности</span><h1>Конкурсы</h1><p>Участвуйте в литературных конкурсах, публикуйте работы и открывайте новые имена.</p></div><div class="contests-stats"><b>{{ loading ? '…' : contests.length }}</b><span>всего конкурсов</span></div></header>
      <nav class="contest-tabs"><button type="button" :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">Активные <b>{{ activeContests.length }}</b></button><button type="button" :class="{ active: activeTab === 'archived' }" @click="activeTab = 'archived'">Завершённые <b>{{ archivedContests.length }}</b></button><button type="button" :class="{ active: activeTab === 'drafts' }" @click="activeTab = 'drafts'">Черновики <b>{{ draftContests.length }}</b></button></nav>
      <p v-if="error" class="ref-error">Не удалось загрузить конкурсы: {{ error.message }}</p>
      <p v-else-if="loading && !result" class="ref-loading">Загружаем конкурсы…</p>
      <section v-else-if="displayedContests.length" class="contest-grid-live"><article v-for="contest in displayedContests" :key="contest.id" class="contest-live-card"><div class="contest-card-top"><span>{{ formatContestScope(contest.contestScope) }}</span><b :class="contest.status">{{ formatContestStatus(contest.status) }}</b></div><h2>{{ contest.title }}</h2><p>{{ excerptText(contest.description, 240) || 'Описание конкурса будет добавлено организатором.' }}</p><dl><dt>Старт</dt><dd>{{ formatDate(contest.startsAt) }}</dd><dt>{{ activeTab === 'archived' ? 'Результаты' : 'Срок' }}</dt><dd>{{ formatDate(deadline(contest)) }}</dd></dl><footer><span v-if="contest.status === 'accepting_entries'">Приём работ открыт</span><span v-else-if="contest.status === 'voting'">Идёт голосование</span><span v-else-if="contest.status === 'draft'">Не опубликован</span><span v-else>Конкурс завершён</span><button type="button" disabled>Подробнее</button></footer></article></section>
      <section v-else class="catalog-empty"><h2>{{ tabLabel }} пока отсутствуют</h2><p>Когда организатор добавит конкурс с этим статусом, он появится здесь автоматически.</p></section>
      <section class="contest-note"><h2>Как это работает</h2><p>Сейчас на этой странице показываются только реальные конкурсы из базы. Подача заявки и голосование будут подключены, когда в API появятся сущности участия и конкурсных работ.</p></section>
    </section>
  </main>
</template>
