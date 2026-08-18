<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery } from '@vue/apollo-composable';
import { AUTHORS_QUERY } from '../lib/graphql.js';
import { excerptText, formatDate } from '../lib/format.js';
import { buildAuthorPageLocation } from '../lib/routes.js';
import { authorAvatarUrl } from '../lib/authorAvatar.js';

const search = ref('');
const onlyClassics = ref(false);
const onlyFeatured = ref(false);
const queryVariables = computed(() => ({ limit: 30, offset: 0, search: search.value.trim() || null, classicsOnly: onlyClassics.value, featuredOnly: onlyFeatured.value }));
const { result, loading, error } = useQuery(AUTHORS_QUERY, queryVariables, { fetchPolicy: 'cache-and-network' });
const authors = computed(() => result.value?.authors ?? []);
function authorInitial(author) { return String(author.displayName || author.login || 'А').trim().slice(0, 1).toUpperCase(); }
function clearFilters() { search.value = ''; onlyClassics.value = false; onlyFeatured.value = false; }
</script>

<template>
  <div class="container authors-page">
    <section class="page-head"><h1>Авторы</h1><p class="muted">Знакомьтесь с авторами Littop, читайте их произведения и открывайте новые литературные голоса.</p></section>
    <section class="stats-line"><label class="authors-search">Поиск <input v-model="search" placeholder="Имя или логин автора"></label><label class="check"><input v-model="onlyFeatured" type="checkbox"> Витрина</label><label class="check"><input v-model="onlyClassics" type="checkbox"> Классики</label><button class="authors-reset" type="button" @click="clearFilters">Сбросить</button></section>
    <p v-if="error" class="ref-error">Не удалось загрузить авторов: {{ error.message }}</p>
    <p v-else-if="loading && !result" class="ref-loading">Загружаем авторов…</p>
    <section v-else-if="authors.length" class="authors">
      <article v-for="author in authors" :key="author.id" class="author">
        <RouterLink class="av" :to="buildAuthorPageLocation(author)"><img :src="authorAvatarUrl(author)" :alt="author.displayName || author.login"></RouterLink>
        <h2><RouterLink :to="buildAuthorPageLocation(author)">{{ author.displayName || author.login }}</RouterLink></h2>
        <p class="authors-login">@{{ author.login }}</p><p>{{ excerptText(author.bio, 130) || 'Автор пока не добавил биографию.' }}</p>
        <div class="authors-tags"><span v-if="author.isFeatured">Витрина</span><span v-if="author.isClassic">Классик</span></div>
        <footer><b>{{ author.ratingTotal }}</b><small>рейтинг</small><b>{{ author.worksCountCached }}</b><small>произведений</small></footer>
        <small>На сайте с {{ formatDate(author.registeredAt) }}</small>
      </article>
    </section>
    <section v-else class="catalog-empty authors-empty"><h2>авторов не найдено</h2><p>Измените условия поиска или очистите фильтры.</p><button type="button" class="btn btn-secondary authors-empty-reset" @click="clearFilters">Очистить фильтры</button></section>
  </div>
</template>
