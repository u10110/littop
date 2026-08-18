import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import Works from '../components/Works.vue';
import WorkPage from '../components/WorkPage.vue';
import Authors from '../components/Authors.vue';
import AuthorPage from '../components/AuthorPage.vue';
import Contests from '../components/Contests.vue';
import Radio from '../components/Radio.vue';
import Forum from '../components/Forum.vue';
import ForumTopicPage from '../components/ForumTopicPage.vue';
import Personal from '../components/Personal.vue';
import Messages from '../components/Messages.vue';
import SocialAuthCallback from '../components/SocialAuthCallback.vue';
import ReferenceInfoPage from '../components/ReferenceInfoPage.vue';
import ReferenceEditorialPage from '../components/ReferenceEditorialPage.vue';
import Login from '../components/Login.vue';
import Terms from '../components/Terms.vue';
import { setDocumentTitle } from '../lib/pageTitle.js';

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: 'Литопотам — литературное сообщество' } },
  { path: '/works', name: 'works', component: Works, meta: { title: 'Произведения' } },
  { path: '/works/:slugOrId', name: 'work-public', component: WorkPage, meta: { title: 'Произведение' } },
  { path: '/authors', name: 'authors', component: Authors, meta: { title: 'Авторы' } },
  { path: '/authors/:login', name: 'author-public', component: AuthorPage, meta: { title: 'Автор' } },
  { path: '/contests', name: 'contests', component: Contests, meta: { title: 'Конкурсы' } },
  { path: '/radio', name: 'radio', component: Radio, meta: { title: 'Радио' } },
  { path: '/forum', name: 'forum', component: Forum, meta: { title: 'Форум' } },
  { path: '/forum/:slugOrId', name: 'forum-topic-public', component: ForumTopicPage, meta: { title: 'Тема форума' } },
  { path: '/personal', name: 'personal', component: Personal, meta: { title: 'Личный кабинет' } },
  { path: '/messages', name: 'messages', component: Messages, meta: { title: 'Мои сообщения' } },
  { path: '/activity', name: 'activity', component: ReferenceInfoPage, meta: { referencePage: 'activity', title: 'Активность' } },
  { path: '/reviews', name: 'reviews', component: ReferenceInfoPage, meta: { referencePage: 'reviews', title: 'Рецензии' } },
  { path: '/albums', name: 'albums', component: ReferenceInfoPage, meta: { referencePage: 'albums', title: 'Альбомы' } },
  { path: '/blogs', name: 'blogs', component: ReferenceInfoPage, meta: { referencePage: 'blogs', title: 'Блоги' } },
  { path: '/about', name: 'about', component: ReferenceInfoPage, meta: { referencePage: 'about', title: 'О Литопотаме' } },
  { path: '/contacts', name: 'contacts', component: ReferenceInfoPage, meta: { referencePage: 'contacts', title: 'Контакты' } },
  { path: '/terms', name: 'terms', component: Terms, meta: { title: 'Пользовательское соглашение' } },
  { path: '/rubrics', name: 'rubrics', component: ReferenceEditorialPage, meta: { referencePage: 'rubrics', title: 'Рубрики' } },
  { path: '/showcase', name: 'showcase', component: ReferenceEditorialPage, meta: { referencePage: 'showcase', title: 'Витрина' } },
  { path: '/forum-sections', name: 'forum-sections', component: ReferenceEditorialPage, meta: { referencePage: 'forum-sections', title: 'Разделы форума' } },
  { path: '/promotion', name: 'promotion', component: ReferenceEditorialPage, meta: { referencePage: 'promotion', title: 'Продвижение автора' } },
  { path: '/editorial-queue', name: 'editorial-queue', component: ReferenceEditorialPage, meta: { referencePage: 'editorial-queue', title: 'Редакционная очередь' } },
  { path: '/account', redirect: '/personal' },
  { path: '/books', redirect: '/works' },
  { path: '/book', redirect: '/works' },
  { path: '/author-page', redirect: '/authors' },
  { path: '/forum-topic', redirect: '/forum' },
  { path: '/auth/callback', name: 'social-auth-callback', component: SocialAuthCallback, meta: { title: 'Вход через соцсеть' } },
  { path: '/login', name: 'login', component: Login, meta: { title: 'Вход' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  setDocumentTitle(to.meta.title || 'Литопотам');
});

export default router;
