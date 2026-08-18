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

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/works', name: 'works', component: Works },
  { path: '/works/:slugOrId', name: 'work-public', component: WorkPage },
  { path: '/authors', name: 'authors', component: Authors },
  { path: '/authors/:login', name: 'author-public', component: AuthorPage },
  { path: '/contests', name: 'contests', component: Contests },
  { path: '/radio', name: 'radio', component: Radio },
  { path: '/forum', name: 'forum', component: Forum },
  { path: '/forum/:slugOrId', name: 'forum-topic-public', component: ForumTopicPage },
  { path: '/personal', name: 'personal', component: Personal },
  { path: '/messages', name: 'messages', component: Messages, meta: { title: 'Мои сообщения' } },
  { path: '/activity', name: 'activity', component: ReferenceInfoPage, meta: { referencePage: 'activity' } },
  { path: '/reviews', name: 'reviews', component: ReferenceInfoPage, meta: { referencePage: 'reviews' } },
  { path: '/albums', name: 'albums', component: ReferenceInfoPage, meta: { referencePage: 'albums' } },
  { path: '/blogs', name: 'blogs', component: ReferenceInfoPage, meta: { referencePage: 'blogs' } },
  { path: '/about', name: 'about', component: ReferenceInfoPage, meta: { referencePage: 'about' } },
  { path: '/contacts', name: 'contacts', component: ReferenceInfoPage, meta: { referencePage: 'contacts' } },
  { path: '/terms', name: 'terms', component: Terms, meta: { title: 'Пользовательское соглашение' } },
  { path: '/rubrics', name: 'rubrics', component: ReferenceEditorialPage, meta: { referencePage: 'rubrics' } },
  { path: '/showcase', name: 'showcase', component: ReferenceEditorialPage, meta: { referencePage: 'showcase' } },
  { path: '/forum-sections', name: 'forum-sections', component: ReferenceEditorialPage, meta: { referencePage: 'forum-sections' } },
  { path: '/promotion', name: 'promotion', component: ReferenceEditorialPage, meta: { referencePage: 'promotion' } },
  { path: '/editorial-queue', name: 'editorial-queue', component: ReferenceEditorialPage, meta: { referencePage: 'editorial-queue' } },
  { path: '/account', redirect: '/personal' },
  { path: '/books', redirect: '/works' },
  { path: '/book', redirect: '/works' },
  { path: '/author-page', redirect: '/authors' },
  { path: '/forum-topic', redirect: '/forum' },
  { path: '/auth/callback', name: 'social-auth-callback', component: SocialAuthCallback },
  { path: '/login', name: 'login', component: Login, meta: { title: 'Вход' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
