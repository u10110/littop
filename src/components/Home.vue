<script setup>
import { computed, inject, ref } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RouterLink } from 'vue-router';

import { HOME_QUERY } from '../lib/graphql.js';
import Icon from '../components/Icon.vue';
import RichTextEditor from './RichTextEditor.vue';
import { sanitizeRichTextHtml } from '../lib/richText.js';
import {
  excerptText,
  formatContestScope,
  formatContestStatus,
  formatDate,
  formatWorkSection,
  ratingLabel,
} from '../lib/format.js';
import { buildAuthorPageLocation, buildForumTopicPageLocation, buildWorkPageLocation } from '../lib/routes.js';

const { result, loading, error } = useQuery(HOME_QUERY, null, {
  fetchPolicy: 'cache-and-network',
});

const siteTagline = inject('siteTagline', {
  value: ref('<p>Литопотам — писать, читать, оценивать</p>'),
  editing: ref(false),
  draft: ref(''),
  busy: ref(false),
  isAdmin: ref(false),
  startEdit: () => {},
  cancelEdit: () => {},
  save: async () => {},
});

const health = computed(() => result.value?.health ?? null);
const featuredAuthors = computed(() => result.value?.featuredAuthors ?? []);
const classicAuthors = computed(() => result.value?.classicAuthors ?? []);
const onlineAuthors = computed(() => result.value?.onlineAuthors ?? []);
const recentWorks = computed(() => result.value?.recentWorks ?? []);
const announcements = computed(() => result.value?.announcements ?? []);
const recentTopics = computed(() => result.value?.recentTopics ?? []);
const editorColumnTopics = computed(() => result.value?.editorColumnTopics ?? []);
const editorLead = computed(() => editorColumnTopics.value[0] ?? null);
const editorColumnExtra = computed(() => {
  const leadId = editorLead.value?.id;
  const seen = new Set();
  const out = [];
  for (const t of [...editorColumnTopics.value.slice(1), ...recentTopics.value]) {
    if (!t?.id || t.id === leadId || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= 12) break;
  }
  out.sort((a, b) => (Number(b?.repliesCount) || 0) - (Number(a?.repliesCount) || 0));
  return out;
});
const contests = computed(() => result.value?.contests ?? []);
const radioTracks = computed(() => result.value?.radioTracks ?? []);

const sortedFeaturedAuthors = computed(() =>
  [...featuredAuthors.value].sort(
    (a, b) => (Number(b?.ratingTotal) || 0) - (Number(a?.ratingTotal) || 0),
  ),
);
const sortedClassicAuthors = computed(() =>
  [...classicAuthors.value].sort(
    (a, b) => (Number(b?.ratingTotal) || 0) - (Number(a?.ratingTotal) || 0),
  ),
);
const sortedRadioTracks = computed(() =>
  [...radioTracks.value].sort(
    (a, b) => (Number(b?.ratingsCount) || 0) - (Number(a?.ratingsCount) || 0),
  ),
);

const homeForumTopics = computed(() =>
  [...recentTopics.value].sort(
    (a, b) => (Number(b?.repliesCount) || 0) - (Number(a?.repliesCount) || 0),
  ),
);

const healthTone = computed(() => {
  if (!health.value) return 'warn';
  return health.value.database ? 'good' : 'danger';
});
</script>

<template>
  <section class="hero">
    <template v-if="!siteTagline.editing">
      <h1 v-html="sanitizeRichTextHtml(siteTagline.value || '<p>Литопотам — писать, читать, оценивать</p>')"></h1>
      <p>Регистрация для авторов, публикация стихов, прозы и проектов. Оценки и комментарии от читателей. Форум для живого общения.</p>
      <button v-if="siteTagline.isAdmin" class="btn btn-sm btn-outline site-banner-edit-btn" type="button" @click="siteTagline.startEdit"><Icon name="pencil" />Изменить</button>
    </template>
    <template v-else>
      <RichTextEditor
        v-model="siteTagline.draft"
        editor-id="home-tagline-draft"
        label=""
        placeholder="Текст на главной"
      />
      <div class="inline-actions">
        <button class="btn btn-sm btn-primary" type="button" :disabled="siteTagline.busy" @click="siteTagline.save">Сохранить</button>
        <button class="btn btn-sm btn-outline" type="button" :disabled="siteTagline.busy" @click="siteTagline.cancelEdit">Отмена</button>
      </div>
    </template>
    <div class="chips">
   
    </div>
  </section>

  <div v-if="error" class="message error">{{ error.message }}</div>

  <section class="stats-grid">
    <article class="card stat">
      <span class="meta">Авторы в витрине</span>
      <span class="value">{{ featuredAuthors.length }}</span>
      <span class="note">выбор редакции</span>
    </article>
    <article class="card stat">
      <span class="meta">Классики</span>
      <span class="value">{{ classicAuthors.length }}</span>
      <span class="note">основной фонд</span>
    </article>
    <article class="card stat">
      <span class="meta">Свежие произведения</span>
      <span class="value">{{ recentWorks.length }}</span>
      <span class="note">последние публикации</span>
    </article>
    <article class="card stat">
      <span class="meta">Темы форума</span>
      <span class="value">{{ recentTopics.length }}</span>
      <span class="note">обновляется по новым темам</span>
    </article>
  </section>

  <section class="layout-columns home-top-columns">
    <div class="section-block editor-column-block">
      <div class="section-head">
        <h2>Колонка редактора</h2>
        <RouterLink to="/forum?section=editor-column" class="btn btn-outline">Все статьи</RouterLink>
      </div>
      <div v-if="editorColumnExtra.length" class="stack">
        <article v-for="topic in editorColumnExtra" :key="`edc-${topic.id}`" class="card">
          <div class="chips">
            <span class="pill">{{ topic.sectionSlug }}</span>
            <span class="pill">ответов: {{ topic.repliesCount }}</span>
          </div>
          <h3>
            <RouterLink :to="buildForumTopicPageLocation(topic)">{{ topic.title }}</RouterLink>
          </h3>
          <div class="meta">
            <RouterLink v-if="topic.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(topic.author)">{{ topic.author?.displayName || topic.author?.login }}</RouterLink>
            <template v-else>{{ topic.author?.displayName || topic.author?.login }}</template>
            · {{ formatDate(topic.lastPostAt || topic.createdAt) }}
          </div>
          <div>{{ excerptText(topic.body, 140) }}</div>
        </article>
      </div>
      <article v-if="editorLead" class="card stack editor-lead">
        <div v-if="editorLead.imageUrl" class="editor-lead-image">
          <img :src="editorLead.imageUrl" :alt="editorLead.title" loading="lazy" />
        </div>
        <div class="chips">
          <span class="pill">Колонка редактора</span>
          <span v-if="editorLead.featuredMain" class="pill good">на главной</span>
          <span class="pill">ответов: {{ editorLead.repliesCount }}</span>
        </div>
        <h3>
          <RouterLink :to="buildForumTopicPageLocation(editorLead)">{{ editorLead.title }}</RouterLink>
        </h3>
        <div class="meta">
          <RouterLink v-if="editorLead.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(editorLead.author)">{{ editorLead.author?.displayName || editorLead.author?.login }}</RouterLink>
          <template v-else>{{ editorLead.author?.displayName || editorLead.author?.login }}</template>
          · {{ formatDate(editorLead.lastPostAt || editorLead.createdAt) }}
        </div>
        <div>{{ excerptText(editorLead.body, 320) }}</div>
        <div class="inline-actions">
          <RouterLink class="btn btn-primary" :to="buildForumTopicPageLocation(editorLead)">Открыть тему</RouterLink>
        </div>
      </article>
      <div v-if="!editorLead && !editorColumnExtra.length" class="empty-state">
        <p>В колонке редактора пока нет опубликованных тем.</p>
      </div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h2>Анонсы</h2>
        <RouterLink to="/works" class="btn btn-outline">Все произведения</RouterLink>
      </div>
      <div v-if="announcements.length" class="stack">
        <article v-for="work in announcements" :key="`announce-${work.id}`" class="card">
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
          <div>{{ excerptText(work.excerpt || work.summary || work.body, 160) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Анонсов пока нет.</div>
    </div>
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
      <div v-if="featuredAuthors.length || classicAuthors.length || onlineAuthors.length" class="stack">
        <article class="card">
          <h3>Витрина</h3>
          <div class="list">
            <div v-for="author in sortedFeaturedAuthors" :key="`featured-${author.id}`" class="inline-card">
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
            <div v-for="author in sortedClassicAuthors" :key="`classic-${author.id}`" class="inline-card">
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
        <article v-for="topic in homeForumTopics" :key="topic.id" class="card">
          <div class="chips">
            <span class="pill">{{ topic.sectionSlug }}</span>
            <span class="pill">ответов: {{ topic.repliesCount }}</span>
          </div>
          <h3>
            <RouterLink :to="buildForumTopicPageLocation(topic)">{{ topic.title }}</RouterLink>
          </h3>
          <div class="meta">
            <RouterLink v-if="topic.author?.login" class="user-inline-link" :to="buildAuthorPageLocation(topic.author)">{{ topic.author?.displayName || topic.author?.login }}</RouterLink>
            <template v-else>{{ topic.author?.displayName || topic.author?.login }}</template>
            · {{ formatDate(topic.lastPostAt || topic.createdAt) }}
          </div>
          <div>{{ excerptText(topic.body, 140) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Пока нет новых тем на форуме.</div>
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
      <div v-else class="empty-state">Сейчас активных конкурсов нет.</div>
    </div>

    <div class="section-block">
      <div class="section-head">
        <h2>Радио</h2>
        <RouterLink to="/radio" class="btn btn-outline">Открыть радио</RouterLink>
      </div>
      <div v-if="radioTracks.length" class="stack">
        <article v-for="track in sortedRadioTracks" :key="track.id" class="card">
          <h3>{{ track.title }}</h3>
          <div class="meta">{{ track.authorName || 'Автор не указан' }} · {{ ratingLabel(track.averageRating, track.ratingsCount) }}</div>
        </article>
      </div>
      <div v-else class="empty-state">Треков пока нет.</div>
    </div>
  </section>
</template>
