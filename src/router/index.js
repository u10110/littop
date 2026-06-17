import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import Works from '../components/Works.vue';
import Authors from '../components/Authors.vue';
import Contests from '../components/Contests.vue';
import Radio from '../components/Radio.vue';
import Forum from '../components/Forum.vue';
import Personal from '../components/Personal.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/works', name: 'works', component: Works },
  { path: '/authors', name: 'authors', component: Authors },
  { path: '/contests', name: 'contests', component: Contests },
  { path: '/radio', name: 'radio', component: Radio },
  { path: '/forum', name: 'forum', component: Forum },
  { path: '/personal', name: 'personal', component: Personal },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
