<script setup>
import { computed } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RouterLink } from 'vue-router';

import { HOME_QUERY } from '../lib/graphql.js';
import {
  excerptText,
  formatContestScope,
  formatContestStatus,
  formatDate,
  formatWorkSection,
  ratingLabel,
} from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';

const { result, loading, error } = useQuery(HOME_QUERY, null, {
  fetchPolicy: 'cache-and-network',
});

const health = computed(() => result.value?.health ?? null);
const featuredAuthors = computed(() => result.value?.featuredAuthors ?? []);
const classicAuthors = computed(() => result.value?.classicAuthors ?? []);
const recentWorks = computed(() => result.value?.recentWorks ?? []);
const recentTopics = computed(() => result.value?.recentTopics ?? []);
const contests = computed(() => result.value?.contests ?? []);
const radioTracks = computed(() => result.value?.radioTracks ?? []);

const healthTone = computed(() => {
  if (!health.value) return 'warn';
  return health.value.database ? 'good' : 'danger';
});
</script>

<template>
  <section class="hero">
      <h1>Литопотам — писать, читать, оценивать</h1>
       <p>Регистрация для авторов, публикация стихов, прозы и проектов. Оценки и комментарии от читателей. Форум для живого общения.</p>
    <div class="chips">
   
    </div>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="stats-grid">
    <article class="card stat">
      <span class="meta">Авторы в витрине</span>
      <span class="value">{{ featuredAuthors.length }}</span>
      <span class="note">featuredOnly=true</span>
    </article>
    <article class="card stat">
      <span class="meta">Классики</span>
      <span class="value">{{ classicAuthors.length }}</span>
      <span class="note">classicsOnly=true</span>
    </article>
    <article class="card stat">
      <span class="meta">Свежие произведения</span>
      <span class="value">{{ recentWorks.length }}</span>
      <span class="note">works(limit: 6)</span>
    </article>
    <article class="card stat">
      <span class="meta">Темы форума</span>
      <span class="value">{{ recentTopics.length }}</span>
      <span class="note">forumTopics(limit: 6)</span>
    </article>
  </section>

  <section class="section-block">
    <div class="section-head">
      <h2>Свежие произведения</h2>
      <RouterLink to="/works" class="btn btn-outline">Открыть каталог</RouterLink>
    </div>

    <div v-if="recentWorks.length" class="list-grid">
      <article v-for="work in recentWorks" :key="work.id" class="card">
        <div class="chips">
          <span class="pill">{{ formatWorkSection(work.sectionCode) }}</span>
          <span class="pill">{{ ratingLabel(work.averageRating, work.ratingsCount) }}</span>
        </div>
        <h3>
          <RouterLink :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink>
        </h3>
        <div class="meta">
          <RouterLink v-if="work.author?.login" :to="buildAuthorPageLocation(work.author)">{{ work.author?.displayName || work.author?.login }}</RouterLink>
          <template v-else>{{ work.author?.displayName || work.author?.login }}</template>
          · {{ formatDate(work.publishedAt || work.createdAt) }}
        </div>
        <div>{{ excerptText(work.excerpt || work.summary || work.body, 180) }}</div>
      </article>
    </div>
    <div v-else class="empty-state">Пока нет опубликованных произведений. Создать первое можно на странице «Произведения».</div>
  </section>

  <section class="layout-columns">
    <div class="section-block">
      <div class="section-head">
        <h2>Авторы</h2>
        <RouterLink to="/authors" class="btn btn-outline">Все авторы</RouterLink>
      </div>
      <div v-if="featuredAuthors.length || classicAuthors.length" class="stack">
        <article class="card">
          <h3>Витрина</h3>
          <div class="list">
            <div v-for="author in featuredAuthors" :key="`featured-${author.id}`" class="inline-card">
              <strong>
                <RouterLink :to="buildAuthorPageLocation(author)">{{ author.displayName }}</RouterLink>
              </strong>
              <div class="meta">@{{ author.login }} · рейтинг {{ author.ratingTotal }}</div>
            </div>
          </div>
        </article>
        <article class="card">
          <h3>Классики</h3>
          <div class="list">
            <div v-for="author in classicAuthors" :key="`classic-${author.id}`" class="inline-card">
              <strong>
                <RouterLink :to="buildAuthorPageLocation(author)">{{ author.displayName }}</RouterLink>
              </strong>
              <div class="meta">{{ author.worksCountCached }} произведений</div>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">В базе пока нет авторов. После регистрации они начнут появляться здесь автоматически.</div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h2>Форум</h2>
        <RouterLink to="/forum" class="btn btn-outline">Открыть форум</RouterLink>
      </div>
      <div v-if="recentTopics.length" class="stack">
        <article v-for="topic in recentTopics" :key="topic.id" class="card">
          <div class="chips">
            <span class="pill">{{ topic.sectionSlug }}</span>
            <span class="pill">ответов: {{ topic.repliesCount }}</span>
          </div>
          <h3>{{ topic.title }}</h3>
          <div class="meta">
            <RouterLink v-if="topic.author?.login" :to="buildAuthorPageLocation(topic.author)">{{ topic.author?.displayName || topic.author?.login }}</RouterLink>
            <template v-else>{{ topic.author?.displayName || topic.author?.login }}</template>
            · {{ formatDate(topic.lastPostAt || topic.createdAt) }}
          </div>
          <div>{{ excerptText(topic.body, 140) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Форумные секции уже доступны, но тем пока нет. Их можно создать из фронта после входа.</div>
    </div>
  </section>

  <section class="layout-columns">
    <div class="section-block">
      <div class="section-head">
        <h2>Конкурсы</h2>
        <RouterLink to="/contests" class="btn btn-outline">Смотреть все</RouterLink>
      </div>
      <div v-if="contests.length" class="stack">
        <article v-for="contest in contests" :key="contest.id" class="card">
          <div class="chips">
            <span class="pill">{{ formatContestScope(contest.contestScope) }}</span>
            <span class="pill">{{ formatContestStatus(contest.status) }}</span>
          </div>
          <h3>{{ contest.title }}</h3>
          <div class="meta">Старт: {{ formatDate(contest.startsAt) }}</div>
          <div>{{ excerptText(contest.description, 140) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Конкурсы пока не загружены в БД. Компонент уже работает с live GraphQL и корректно показывает пустое состояние.</div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h2>Радио</h2>
        <RouterLink to="/radio" class="btn btn-outline">Открыть радио</RouterLink>
      </div>
      <div v-if="radioTracks.length" class="stack">
        <article v-for="track in radioTracks" :key="track.id" class="card">
          <h3>{{ track.title }}</h3>
          <div class="meta">{{ track.authorName || 'Автор не указан' }} · {{ ratingLabel(track.averageRating, track.ratingsCount) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Треков пока нет, но страница уже читает данные из radioTracks(limit: 6).</div>
    </div>
  </section>
</template>
