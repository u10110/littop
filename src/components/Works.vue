<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';
import { WORK_GENRES_QUERY, WORKS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation, buildWorksQuery, normalizeWorksPage } from '../lib/routes.js';
import { buildWorksPagination } from '../lib/worksPagination.js';
import { useSession } from '../lib/session.js';
import coverFog from '../assets/new-reference/book-fog.jpg';
import coverShadows from '../assets/new-reference/book-shadows.jpg';
import coverRiver from '../assets/new-reference/book-river.jpg';
import coverWind from '../assets/new-reference/book-wind.jpg';

const route = useRoute();
const router = useRouter();
const sectionFilter = ref('');
const genreFilter = ref('');
const search = ref('');
const mineOnly = ref(false);
const todayOnly = ref(false);
const page = ref(1);
const pageSize = 24;
const requestLimit = pageSize + 1;
const { currentUser } = useSession();
const allowedSectionCodes = new Set(['poetry', 'prose', 'project']);
const sectionOptions = [
  { value: '', label: 'Все жанры' }, { value: 'poetry', label: 'Поэзия' },
  { value: 'prose', label: 'Проза' }, { value: 'project', label: 'Творческие проекты' },
];
const covers = [coverFog, coverShadows, coverRiver, coverWind];
function takeQueryValue(value) { return Array.isArray(value) ? (typeof value[0] === 'string' ? value[0] : '') : (typeof value === 'string' ? value : ''); }
function normalizeSectionQuery(value) { const normalized = takeQueryValue(value).trim(); return allowedSectionCodes.has(normalized) ? normalized : ''; }
function normalizeGenreQuery(value) { return takeQueryValue(value).trim(); }
function normalizeSearchQuery(value) { return takeQueryValue(value).trim(); }
function normalizeBooleanQuery(value) { return ['1', 'true', 'yes'].includes(takeQueryValue(value).trim().toLowerCase()); }
function normalizePageQuery(value) { return normalizeWorksPage(takeQueryValue(value)); }
function applyFiltersFromQuery(query) { sectionFilter.value = normalizeSectionQuery(query.section); genreFilter.value = normalizeGenreQuery(query.genre); search.value = normalizeSearchQuery(query.search); mineOnly.value = normalizeBooleanQuery(query.mine); todayOnly.value = normalizeBooleanQuery(query.today); page.value = normalizePageQuery(query.page); }
function buildNextQuery() { return buildWorksQuery({ section: sectionFilter.value, genre: genreFilter.value, search: search.value, mine: mineOnly.value, today: todayOnly.value, page: page.value }); }
function snapshot(query) { return JSON.stringify({ section: normalizeSectionQuery(query.section), genre: normalizeGenreQuery(query.genre), search: normalizeSearchQuery(query.search), mine: normalizeBooleanQuery(query.mine), today: normalizeBooleanQuery(query.today), page: normalizePageQuery(query.page) }); }
watch(() => route.query, (query) => { if (snapshot(query) !== JSON.stringify({ section: sectionFilter.value, genre: genreFilter.value, search: search.value.trim(), mine: mineOnly.value, today: todayOnly.value, page: page.value })) applyFiltersFromQuery(query); }, { immediate: true });
watch([sectionFilter, genreFilter, search, mineOnly, todayOnly, page], () => { if (snapshot(route.query) !== JSON.stringify({ section: sectionFilter.value, genre: genreFilter.value, search: search.value.trim(), mine: mineOnly.value, today: todayOnly.value, page: page.value })) router.replace({ query: buildNextQuery() }); });
watch([sectionFilter, genreFilter, search, mineOnly, todayOnly], () => { if (page.value !== 1) page.value = 1; });
watch(sectionFilter, () => { if (genreFilter.value) genreFilter.value = ''; });
const authorFilterActive = computed(() => mineOnly.value && Boolean(currentUser.value?.id));
const mineFilterNeedsAuth = computed(() => mineOnly.value && !authorFilterActive.value);
const queryVariables = computed(() => ({ limit: requestLimit, offset: (page.value - 1) * pageSize, sectionCode: sectionFilter.value || null, genreSlug: genreFilter.value || null, search: search.value.trim() || null, authorId: authorFilterActive.value ? currentUser.value.id : null, createdToday: todayOnly.value || null }));
const genreQueryVariables = computed(() => ({ sectionCode: sectionFilter.value || null }));
const { result, loading, error } = useQuery(WORKS_QUERY, queryVariables, { fetchPolicy: 'cache-and-network' });
const { result: genresResult } = useQuery(WORK_GENRES_QUERY, genreQueryVariables, { fetchPolicy: 'cache-and-network' });
const genreOptions = computed(() => genresResult.value?.workGenres ?? []);
const pagination = computed(() => buildWorksPagination({ page: page.value, pageSize, items: result.value?.works ?? [] }));
const works = computed(() => pagination.value.items);
watch(() => Boolean(result.value) && pagination.value.isInvalidPage, (isInvalidPage) => { if (isInvalidPage) page.value = 1; });
function clearFilters() { sectionFilter.value = ''; genreFilter.value = ''; search.value = ''; mineOnly.value = false; todayOnly.value = false; page.value = 1; }
function goToPage(nextPage) { page.value = Math.max(1, nextPage); }
function coverFor(index) { return covers[index % covers.length]; }
</script>

<template>
  <main class="catalog-ref">
    <div class="catalog-shell">
      <aside class="catalog-filters">
        <h1>Фильтры</h1>
        <label>Жанр<select v-model="sectionFilter"><option v-for="option in sectionOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option></select></label>
        <div v-if="genreOptions.length" class="check-list"><label><input v-model="genreFilter" type="radio" name="work-genre" value="">Все жанры</label><label v-for="genre in genreOptions" :key="genre.slug"><input v-model="genreFilter" type="radio" name="work-genre" :value="genre.slug">{{ genre.name }}</label></div>
        <p v-else class="ref-empty">Для выбранного раздела пока нет жанров.</p>
        <hr>
        <label>Рейтинг<select><option>Любой</option></select></label><p class="stars">★★★★★ <span>и выше</span></p>
        <label>Длина произведения<select><option>Любая</option></select></label>
        <label>Язык<select><option>Любой</option></select></label>
        <label>Режим произведения<select><option>Любой</option></select></label>
        <button type="button" class="btn btn-primary" @click="page = 1">Применить</button>
        <button type="button" class="reset" @click="clearFilters">Сбросить</button>
      </aside>
      <section class="catalog-list">
        <div class="catalog-top"><span>Найдено {{ works.length }} произведений</span><label>Сортировка:<select><option>По популярности</option></select></label></div>
        <div class="catalog-extra-filters"><label><input v-model="mineOnly" type="checkbox"> Только мои произведения</label><label><input v-model="todayOnly" type="checkbox"> Произведения за сегодня</label></div>
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
        <nav v-if="works.length && (pagination.hasPrevious || pagination.hasNext)" class="pagination" aria-label="Страницы каталога">
          <button v-if="pagination.hasPrevious" type="button" aria-label="Предыдущая страница" @click="goToPage(page - 1)">‹</button>
          <b aria-current="page">{{ page }}</b>
          <button v-if="pagination.hasNext" type="button" aria-label="Следующая страница" @click="goToPage(page + 1)">›</button>
        </nav>
      </section>
    </div>
  </main>
</template>
