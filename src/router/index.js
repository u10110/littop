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
import SocialAuthCallback from '../components/SocialAuthCallback.vue';

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: 'Главная' } },
  { path: '/works', name: 'works', component: Works, meta: { title: 'Произведения' } },
  { path: '/works/:slugOrId', name: 'work-public', component: WorkPage, meta: { title: 'Произведение' } },
  { path: '/authors', name: 'authors', component: Authors, meta: { title: 'Авторы' } },
  { path: '/authors/:login', name: 'author-public', component: AuthorPage, meta: { title: 'Страница автора' } },
  { path: '/contests', name: 'contests', component: Contests, meta: { title: 'Конкурсы' } },
  { path: '/radio', name: 'radio', component: Radio, meta: { title: 'Радио' } },
  { path: '/forum', name: 'forum', component: Forum, meta: { title: 'Форум' } },
  { path: '/forum/:slugOrId', name: 'forum-topic-public', component: ForumTopicPage, meta: { title: 'Тема форума' } },
  { path: '/personal', name: 'personal', component: Personal, meta: { title: 'Мой кабинет' } },
  { path: '/auth/callback', name: 'social-auth-callback', component: SocialAuthCallback, meta: { title: 'Авторизация' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
