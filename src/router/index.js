import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import Works from '../components/Works.vue';
import WorkPage from '../components/WorkPage.vue';
import Authors from '../components/Authors.vue';
import AuthorPage from '../components/AuthorPage.vue';
import AuthorFeedback from '../components/AuthorFeedback.vue';
import Contests from '../components/Contests.vue';
import Radio from '../components/Radio.vue';
import Forum from '../components/Forum.vue';
import ForumTopicPage from '../components/ForumTopicPage.vue';
import Personal from '../components/Personal.vue';
import PrivateMessages from '../components/PrivateMessages.vue';
import SocialAuthCallback from '../components/SocialAuthCallback.vue';
import TermsAgreement from '../components/TermsAgreement.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/works', name: 'works', component: Works },
  { path: '/works/:slugOrId', name: 'work-public', component: WorkPage },
  { path: '/authors', name: 'authors', component: Authors },
  { path: '/authors/:login', name: 'author-public', component: AuthorPage },
  { path: '/authors/:login/feedback/:kind', name: 'author-feedback', component: AuthorFeedback },
  { path: '/contests', name: 'contests', component: Contests },
  { path: '/radio', name: 'radio', component: Radio },
  { path: '/forum', name: 'forum', component: Forum },
  { path: '/forum/:slugOrId', name: 'forum-topic-public', component: ForumTopicPage },
  { path: '/personal', name: 'personal', component: Personal },
  { path: '/messages', name: 'private-messages', component: PrivateMessages },
  { path: '/terms', name: 'terms', component: TermsAgreement },
  { path: '/auth/callback', name: 'social-auth-callback', component: SocialAuthCallback },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      // Даём форуму (и списку тем) отрисоваться, затем скроллим к якорю.
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            el: to.hash,
            behavior: "smooth",
            top: 90, // запас под sticky-шапку
          });
        }, 400);
      });
    }
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

export default router;
