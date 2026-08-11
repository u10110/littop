<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';
import { WORKS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';
import { useSession } from '../lib/session.js';
import coverFog from '../assets/new-reference/book-fog.jpg';
import coverShadows from '../assets/new-reference/book-shadows.jpg';
import coverRiver from '../assets/new-reference/book-river.jpg';
import coverWind from '../assets/new-reference/book-wind.jpg';

const route = useRoute();
const router = useRouter();
const sectionFilter = ref('');
const search = ref('');
const mineOnly = ref(false);
const { currentUser, isAuthenticated } = useSession();
const allowedSectionCodes = new Set(['poetry', 'prose', 'project']);
const sectionOptions = [
  { value: '', label: 'Все жанры' }, { value: 'poetry', label: 'Поэзия' },
  { value: 'prose', label: 'Проза' }, { value: 'project', label: 'Творческие проекты' },
];
const genreOptions = ['Фэнтези', 'Детектив', 'Драма', 'Проза', 'Поэзия', 'Рассказ', 'Любовный роман', 'Юмор', 'Приключения', 'Другое'];
const covers = [coverFog, coverShadows, coverRiver, coverWind];
function takeQueryValue(value) { return Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : ''); }
function normalizeSectionQuery(value) { const normalized = takeQueryValue(value).trim(); return allowedSectionCodes.has(normalized) ? normalized : ''; }
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
function clearFilters() { sectionFilter.value = ''; search.value = ''; mineOnly.value = false; }
function coverFor(index) { return covers[index % covers.length]; }
</script>

<template>
  <main class="catalog-ref">
    <div class="catalog-shell">
      <aside class="catalog-filters">
        <h1>Фильтры</h1>
        <label>Жанр<select v-model="sectionFilter"><option v-for="option in sectionOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option></select></label>
        <div class="check-list"><label v-for="genre in genreOptions" :key="genre"><input type="checkbox">{{ genre }}</label></div>
        <hr>
        <label>Рейтинг<select><option>Любой</option></select></label><p class="stars">★★★★★ <span>и выше</span></p>
        <label>Длина произведения<select><option>Любая</option></select></label>
        <label>Язык<select><option>Любой</option></select></label>
        <label>Режим произведения<select><option>Любой</option></select></label>
        <button type="button" class="btn btn-primary" @click="mineOnly = !mineOnly">{{ mineOnly ? 'Только мои' : 'Применить' }}</button>
        <button type="button" class="reset" @click="clearFilters">Сбросить</button>
      </aside>
      <section class="catalog-list">
        <div class="catalog-top"><span>Найдено {{ works.length }} произведений</span><label>Сортировка:<select><option>По популярности</option></select></label></div>
        <p v-if="mineFilterNeedsAuth" class="ref-error">Для фильтра «Мои произведения» войдите в аккаунт.</p>
        <p v-if="error" class="ref-error">Не удалось загрузить каталог: {{ error.message }}</p>
        <p v-else-if="loading && !result" class="ref-loading">Загружаем произведения…</p>
        <section v-else-if="works.length" class="catalog-cards">
          <article v-for="(work, index) in works" :key="work.id" class="catalog-card">
            <RouterLink class="catalog-cover" :to="buildWorkPageLocation(work)" :aria-label="`Открыть «${work.title}»`"><img :src="coverFor(index)" :alt="work.title"></RouterLink>
            <div><h2><RouterLink class="work-link" :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink></h2><RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)">{{ work.author.displayName || work.author.login }}</RouterLink><p class="genres">{{ formatWorkSection(work.sectionCode) }}</p><p>{{ excerptText(work.summary || work.excerpt || work.body, 150) || 'Автор пока не добавил аннотацию к произведению.' }}</p><small>♡ {{ work.likesCount || 0 }} &nbsp; · Обновлено: {{ formatDate(work.publishedAt || work.createdAt) }}</small></div><b class="score">★ {{ ratingLabel(work.averageRating, work.ratingsCount).split(' / ')[0] }}</b>
          </article>
        </section>
        <section v-else class="catalog-empty"><h2>По этому запросу ничего не найдено</h2><p>Попробуйте изменить раздел или очистить условия поиска.</p><button type="button" @click="clearFilters">Очистить фильтры</button></section>
        <nav v-if="works.length" class="pagination" aria-label="Страницы каталога"><b>1</b><a>2</a><a>3</a><a>4</a><a>5</a><i>…</i><a>125</a><a>›</a></nav>
      </section>
    </div>
  </main>
</template>
