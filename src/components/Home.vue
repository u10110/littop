<script setup>
import { computed } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { RouterLink } from 'vue-router';
import { HOME_QUERY } from '../lib/graphql.js';
import { formatDate, formatWorkSection, ratingLabel } from '../lib/format.js';
import { buildAuthorPageLocation, buildWorkPageLocation } from '../lib/routes.js';

import bookFog from '../assets/new-reference/book-fog.jpg';
import bookShadows from '../assets/new-reference/book-shadows.jpg';
import bookRiver from '../assets/new-reference/book-river.jpg';
import bookWind from '../assets/new-reference/book-wind.jpg';
import newLetters from '../assets/new-reference/new-letters.jpg';
import newStars from '../assets/new-reference/new-stars.jpg';
import newLight from '../assets/new-reference/new-light.jpg';
import contestSpring from '../assets/new-reference/contest-spring.jpg';

const { result, loading, error } = useQuery(HOME_QUERY, null, { fetchPolicy: 'cache-and-network' });
const featuredAuthors = computed(() => result.value?.featuredAuthors ?? []);
const classicAuthors = computed(() => result.value?.classicAuthors ?? []);
const todayVisitors = computed(() => result.value?.todayVisitors ?? []);
const recentWorks = computed(() => result.value?.recentWorks ?? []);
const recentTopics = computed(() => result.value?.recentTopics ?? []);
const editorColumnTopics = computed(() => result.value?.editorColumnTopics ?? []);
const announcements = computed(() => result.value?.announcements ?? []);
const recentComments = computed(() => result.value?.recentComments ?? []);
const contests = computed(() => result.value?.contests ?? []);
const radioTracks = computed(() => result.value?.radioTracks ?? []);
const workImages = [bookFog, bookShadows, bookRiver, bookWind];
const freshImages = [newLetters, newStars, newLight];
const workKey = (work) => String(work?.id || work?.slug || work?.title || '');
const weeklyWorks = computed(() => recentWorks.value.slice(0, 4));
const announcementWorks = computed(() => {
  const weeklyKeys = new Set(weeklyWorks.value.map(workKey));
  return announcements.value.filter((work) => !weeklyKeys.has(workKey(work)));
});
const freshWorks = computed(() => {
  const shownKeys = new Set([...weeklyWorks.value, ...announcementWorks.value].map(workKey));
  return recentWorks.value.filter((work) => !shownKeys.has(workKey(work))).slice(0, 3);
});
const editorTopics = computed(() => editorColumnTopics.value);
const latestTopics = computed(() => recentTopics.value.slice(0, 3));
const discussionTopics = computed(() => [...recentTopics.value].sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0)).slice(0, 3));
const featuredContest = computed(() => contests.value[0] ?? null);
const nowTrack = computed(() => radioTracks.value[0] ?? null);
const topAuthors = computed(() => [...featuredAuthors.value].sort((a,b) => (b.ratingTotal || 0) - (a.ratingTotal || 0)).slice(0, 5));
function authorName(author) { return author?.displayName || author?.login || 'Автор Littop'; }
function shortDate(value) { return value ? formatDate(value) : 'недавно'; }
function openAuth(mode) { window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode } })); }
</script>

<template>
  <div class="home-ref">
    <div v-if="error" class="ref-error">Не удалось загрузить данные: {{ error.message }}</div>
    <div v-else-if="loading && !result" class="ref-loading">Загружаем актуальные публикации…</div>

    <div class="home-layout">
      <section class="home-main">
        <section class="weekly">
          <div class="home-title"><h1>Лучшие произведения недели</h1><RouterLink to="/works" class="home-action-link" aria-label="Открыть каталог произведений" title="Открыть каталог произведений"><span aria-hidden="true">↗</span></RouterLink></div>
          <div v-if="weeklyWorks.length" class="weekly-list">
            <article v-for="(work, index) in weeklyWorks" :key="work.id" class="weekly-work">
              <img :src="workImages[index % workImages.length]" :alt="work.title"><div><h3><RouterLink :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink></h3><p>{{ authorName(work.author) }}</p><em>{{ formatWorkSection(work.sectionCode) }}</em><small>♡ {{ work.likesCount || 0 }}</small></div>
            </article>
          </div>
          <p v-else class="ref-empty">Опубликованные произведения появятся здесь автоматически.</p>
        </section>

        <section class="live-home-strip">
          <section class="live-card editor-column"><div class="live-card-head"><div><span class="live-kicker">Мнение команды</span><h2>Колонка редактора</h2></div><RouterLink to="/forum" class="home-action-link" aria-label="Открыть все статьи" title="Открыть все статьи"><span aria-hidden="true">↗</span></RouterLink></div>
            <article v-for="topic in editorTopics" :key="topic.id" class="editor-item"><h3><RouterLink :to="{ name: 'forum-topic-public', params: { slugOrId: topic.slug || topic.id } }">{{ topic.title }}</RouterLink></h3><p>{{ topic.body }}</p><footer><span>{{ authorName(topic.author) }} · {{ shortDate(topic.createdAt) }}</span><span>💬 {{ topic.repliesCount || 0 }}</span></footer></article>
            <p v-if="!editorTopics.length" class="ref-empty">Редакционные темы появятся после публикации в разделе «Колонка редактора».</p>
          </section>
          <section class="live-card announcements"><div class="live-card-head"><div><span class="live-kicker">Выбор авторов</span><h2>Анонсы</h2></div><RouterLink to="/works" class="home-action-link" aria-label="Открыть все произведения" title="Открыть все произведения"><span aria-hidden="true">↗</span></RouterLink></div>
            <article v-for="work in announcementWorks" :key="work.id" class="announce-item"><span class="announce-genre">{{ formatWorkSection(work.sectionCode).toUpperCase() }}</span><h3><RouterLink :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink></h3><p>{{ authorName(work.author) }} · опубликовано {{ shortDate(work.publishedAt || work.createdAt) }}</p><div><span>★ {{ ratingLabel(work.averageRating, work.ratingsCount) }}</span><span>◉ {{ work.commentsCount || 0 }}</span></div></article>
            <p v-if="!announcementWorks.length" class="ref-empty">Здесь пока нет анонсов.</p>
          </section>
          <section class="live-card fresh-works"><div class="live-card-head"><div><span class="live-kicker">Последние публикации</span><h2>Свежие произведения</h2></div><RouterLink to="/works" class="home-action-link" aria-label="Открыть каталог произведений" title="Открыть каталог произведений"><span aria-hidden="true">↗</span></RouterLink></div>
            <article v-for="(work,index) in freshWorks" :key="work.id" class="fresh-work"><img :src="freshImages[index % freshImages.length]" :alt="work.title"><span><b><RouterLink :to="buildWorkPageLocation(work)">{{ work.title }}</RouterLink></b><small>{{ authorName(work.author) }} · {{ shortDate(work.publishedAt || work.createdAt) }}</small><em>{{ formatWorkSection(work.sectionCode) }}</em></span></article>
            <p v-if="!freshWorks.length" class="ref-empty">Новых публикаций пока нет.</p>
          </section>
        </section>

        <section class="forum-home"><div class="home-title"><h2>Форум</h2><RouterLink to="/forum" class="home-action-link" aria-label="Открыть форум" title="Открыть форум"><span aria-hidden="true">↗</span></RouterLink></div><div class="forum-home-grid">
          <section><div class="forum-subhead"><h3>Самые обсуждаемые</h3><RouterLink to="/forum" class="home-action-link" aria-label="Открыть все темы форума" title="Открыть все темы форума"><span aria-hidden="true">↗</span></RouterLink></div><RouterLink v-for="topic in discussionTopics" :key="topic.id" :to="{ name:'forum-topic-public', params:{slugOrId:topic.slug || topic.id} }" class="forum-home-topic"><span class="forum-topic-mark">💬</span><span><b>{{ topic.title }}</b><small>{{ topic.sectionSlug }} · {{ authorName(topic.author) }}</small></span><em>{{ topic.repliesCount || 0 }}</em></RouterLink></section>
          <section><div class="forum-subhead"><h3>Новые темы</h3><RouterLink to="/forum" class="home-action-link" aria-label="Открыть все темы форума" title="Открыть все темы форума"><span aria-hidden="true">↗</span></RouterLink></div><RouterLink v-for="topic in latestTopics" :key="topic.id" :to="{ name:'forum-topic-public', params:{slugOrId:topic.slug || topic.id} }" class="forum-home-topic"><span class="forum-topic-mark">✦</span><span><b>{{ topic.title }}</b><small>{{ topic.sectionSlug }} · {{ authorName(topic.author) }} · {{ topic.viewsCount || 0 }} просмотров</small></span><em>{{ topic.repliesCount || 0 }}</em></RouterLink></section>
        </div></section>

        <div class="home-duo bottom-duo"><section class="contest-home"><h2>Конкурсы</h2><div><img :src="contestSpring" alt="Конкурсы Littop"><span><h3><RouterLink to="/contests">{{ featuredContest?.title || 'Конкурсы Littop' }}</RouterLink></h3><p>{{ featuredContest?.description || 'Актуальные литературные конкурсы для авторов.' }}</p><b v-if="featuredContest">Статус: {{ featuredContest.status }}</b><small v-if="featuredContest">до {{ shortDate(featuredContest.submissionEndsAt) }}</small></span></div></section><section class="news-home"><h2>Литературные новости</h2><ul class="news-home-list"><li><RouterLink to="/forum"><span>Новые обсуждения и редакционные материалы</span><time>сегодня</time></RouterLink></li><li><RouterLink to="/contests"><span>Следите за конкурсами и анонсами</span><time>в Littop</time></RouterLink></li></ul></section></div>
        <section class="live-card live-radio"><div class="live-card-head"><div><span class="live-kicker">В эфире</span><h2>Радио</h2></div><RouterLink to="/radio" class="home-action-link" aria-label="Открыть радио" title="Открыть радио"><span aria-hidden="true">↗</span></RouterLink></div><div v-if="nowTrack" class="radio-now"><RouterLink to="/radio" class="radio-play">▶</RouterLink><div><b>{{ nowTrack.title }}</b><p>{{ nowTrack.authorName || 'Литературное радио Littop' }}</p></div><span class="radio-live">LIVE</span></div><ol class="radio-list"><li v-for="(track,index) in radioTracks.slice(0,2)" :key="track.id"><span>0{{ index + 1 }}</span><b>{{ track.title }}</b><small>{{ track.authorName || 'Автор' }}</small><time>{{ track.durationSeconds ? Math.floor(track.durationSeconds / 60) + ':' + String(track.durationSeconds % 60).padStart(2,'0') : '—' }}</time></li></ol><p v-if="!radioTracks.length" class="ref-empty">В эфире пока нет записей.</p></section>
      </section>

      <aside class="home-side"><section class="welcome"><h2>Добро пожаловать!</h2><p>Littop — это пространство, где рождаются истории, объединяются авторы и вдохновляются читатели.</p><div><button class="btn btn-primary" @click="openAuth('login')">Войти</button><button class="btn btn-secondary" @click="openAuth('register')">Регистрация</button></div></section>
        <section class="side-block ranking"><div class="home-title"><h2>Рейтинг авторов</h2><RouterLink to="/authors" class="home-action-link" aria-label="Открыть рейтинг авторов" title="Открыть рейтинг авторов"><span aria-hidden="true">↗</span></RouterLink></div><ol><li v-for="author in topAuthors" :key="author.id"><img v-if="author.avatarUrl" :src="author.avatarUrl" :alt="authorName(author)"><i v-else>{{ authorName(author).slice(0,2).toUpperCase() }}</i><RouterLink :to="buildAuthorPageLocation(author)">{{ authorName(author) }}</RouterLink><b>{{ author.ratingTotal || 0 }}</b></li></ol><p v-if="!topAuthors.length" class="ref-empty">Рейтинг появится с авторами.</p></section>
        <section class="side-block classics"><div class="home-title"><h2>Классики</h2><RouterLink to="/authors" class="home-action-link" aria-label="Открыть всех классиков" title="Открыть всех классиков"><span aria-hidden="true">↗</span></RouterLink></div><ol><li v-for="author in classicAuthors" :key="author.id"><img v-if="author.avatarUrl" :src="author.avatarUrl" :alt="authorName(author)"><i v-else>{{ authorName(author).slice(0,2).toUpperCase() }}</i><RouterLink :to="buildAuthorPageLocation(author)">{{ authorName(author) }}</RouterLink><b>{{ author.ratingTotal || 0 }}</b></li></ol><p v-if="!classicAuthors.length" class="ref-empty">Классики пока не отмечены.</p></section>
        <section class="side-block comments"><h2>Новые комментарии</h2><article v-for="comment in recentComments" :key="comment.id"><span class="comment-avatar">◉</span><p><b>{{ authorName(comment.author) }}</b> к <RouterLink :to="buildWorkPageLocation(comment.work)">«{{ comment.work?.title || 'произведению' }}»</RouterLink><strong>{{ comment.body }}</strong><small>{{ shortDate(comment.createdAt) }}</small></p></article><p v-if="!recentComments.length" class="ref-empty">Новых комментариев пока нет.</p><RouterLink to="/works" class="home-action-link" aria-label="Открыть каталог произведений" title="Открыть каталог произведений"><span aria-hidden="true">↗</span></RouterLink></section>
        <section class="side-block today-visitors"><div class="home-title"><h2>Сегодня заходили</h2><RouterLink to="/authors" class="home-action-link" aria-label="Открыть всех авторов" title="Открыть всех авторов"><span aria-hidden="true">↗</span></RouterLink></div><div class="visitor-list"><RouterLink v-for="author in todayVisitors" :key="author.id" :to="buildAuthorPageLocation(author)"><img v-if="author.avatarUrl" :src="author.avatarUrl" :alt="authorName(author)"><i v-else>◉</i><span><b>{{ authorName(author) }}</b><small>был сегодня на сайте</small></span><em>сегодня</em></RouterLink></div><p v-if="!todayVisitors.length" class="ref-empty">Сегодня ещё никто не отметился.</p></section>
      </aside>
    </div>
  </div>
</template>
