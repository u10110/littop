<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';
import { WORKS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';

const route = useRoute();
const router = useRouter();
const sectionFilter = ref('');
const search = ref('');
const mineOnly = ref(false);
const { currentUser, isAuthenticated } = useSession();
const allowedSectionCodes = new Set(['poetry', 'prose', 'project']);
const sectionOptions = [
  { value: '', label: 'Все разделы' }, { value: 'poetry', label: 'Поэзия' },
  { value: 'prose', label: 'Проза' }, { value: 'project', label: 'Творческие проекты' },
];
function takeQueryValue(value) { return Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : ''); }
function normalizeSectionQuery(value) { const valueNormalized = takeQueryValue(value).trim(); return allowedSectionCodes.has(valueNormalized) ? valueNormalized : ''; }
function normalizeSearchQuery(value) { return takeQueryValue(value).trim(); }
function normalizeMineQuery(value) { return ['1', 'true', 'yes', 'mine', 'my'].includes(takeQueryValue(value).trim().toLowerCase()); }
function applyFiltersFromQuery(query) { sectionFilter.value = normalizeSectionQuery(query.section); search.value = normalizeSearchQuery(query.search); mineOnly.value = normalizeMineQuery(query.mine); }
function buildNextQuery(baseQuery) { const next = { ...baseQuery }; if (sectionFilter.value) next.section = sectionFilter.value; else delete next.section; if (search.value.trim()) next.search = search.value.trim(); else delete next.search; if (mineOnly.value) next.mine = '1'; else delete next.mine; return next; }
function snapshot(query) { return JSON.stringify({ section: normalizeSectionQuery(query.section), search: normalizeSearchQuery(query.search), mine: normalizeMineQuery(query.mine) }); }
watch(() => route.query, (query) => { if (snapshot(query) !== JSON.stringify({ section: sectionFilter.value, search: search.value.trim(), mine: mineOnly.value })) applyFiltersFromQuery(query); }, { immediate: true });
watch([sectionFilter, search, mineOnly], () => { if (snapshot(route.query) !== JSON.stringify({ section: sectionFilter.value, search: search.value.trim(), mine: mineOnly.value })) router.replace({ query: buildNextQuery(route.query) }); });
const authorFilterActive = computed(() => mineOnly.value && Boolean(currentUser.value?.id));
const mineFilterNeedsAuth = computed(() => mineOnly.value && !authorFilterActive.value);
const queryVariables = computed(() => ({ limit: 24, offset: 0, sectionCode: sectionFilter.value || null, search: search.value.trim() || null, authorId: authorFilterActive.value ? currentUser.value.id : null }));
const { result, loading, error } = useQuery(WORKS_QUERY, queryVariables, { fetchPolicy: 'cache-and-network' });
const works = computed(() => result.value?.works ?? []);
const activeFilterPills = computed(() => [sectionFilter.value && sectionOptions.find((item) => item.value === sectionFilter.value)?.label, search.value.trim() && `Поиск: ${search.value.trim()}`, mineOnly.value && 'Мои произведения'].filter(Boolean));
function clearFilters() { sectionFilter.value = ''; search.value = ''; mineOnly.value = false; }
function workInitial(work) { return String(work.title || 'L').trim().slice(0, 1).toUpperCase(); }
</script>

<template>
  <main class="catalog-shell">
    <section class="catalog-top">
      <div><span class="catalog-kicker">Библиотека Littop</span><h1>Произведения</h1><p>Читайте прозу, поэзию и авторские проекты, открывайте новых авторов и обсуждайте тексты.</p></div>
      <RouterLink v-if="isAuthenticated" to="/personal" class="catalog-create">+ Опубликовать произведение</RouterLink>
    </section>
    <section class="catalog-filters">
      <label><span>Раздел</span><select v-model="sectionFilter"><option v-for="option in sectionOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option></select></label>
      <label class="catalog-search"><span>Поиск</span><input v-model="search" placeholder="Название, автор или фрагмент текста"></label>
      <div class="catalog-filter-actions"><button type="button" :class="{ active: mineOnly }" @click="mineOnly = !mineOnly">Мои произведения</button><button type="button" class="reset-filter" @click="clearFilters">Сбросить</button></div>
    </section>
    <div v-if="activeFilterPills.length" class="catalog-pills"><span v-for="pill in activeFilterPills" :key="pill">{{ pill }}</span></div>
    <p v-if="mineFilterNeedsAuth" class="ref-error">Для фильтра «Мои произведения» войдите в аккаунт.</p>
    <p v-if="error" class="ref-error">Не удалось загрузить каталог: {{ error.message }}</p>
    <p v-else-if="loading && !result" class="ref-loading">Загружаем произведения…</p>
    <section v-else-if="works.length" class="catalog-cards">
      <article v-for="work in works" :key="work.id" class="catalog-card">
        <RouterLink class="catalog-cover" :to="buildWorkPageLocation(work)" :aria-label="`Открыть «${work.title}»`"><span>{{ workInitial(work) }}</span><em>{{ formatWorkSection(work.sectionCode) }}</em></RouterLink>
        <div class="catalog-card-body"><div class="catalog-card-meta"><span>{{ formatWorkSection(work.sectionCode) }}</span><span>{{ formatDate(work.publishedAt || work.createdAt) }}</span></div><h2><RouterLink :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink></h2><RouterLink v-if="work.author?.login" class="catalog-author" :to="buildAuthorPageLocation(work.author)">{{ work.author.displayName || work.author.login }}</RouterLink><p>{{ excerptText(work.summary || work.excerpt || work.body, 150) || 'Автор пока не добавил аннотацию к произведению.' }}</p><footer><span>★ {{ ratingLabel(work.averageRating, work.ratingsCount) }}</span><span>♡ {{ work.likesCount || 0 }}</span><span>💬 {{ work.commentsCount || 0 }}</span></footer></div>
      </article>
    </section>
    <section v-else class="catalog-empty"><h2>По этому запросу ничего не найдено</h2><p>Попробуйте изменить раздел или очистить условия поиска.</p><button type="button" @click="clearFilters">Очистить фильтры</button></section>
  </main>
</template>
