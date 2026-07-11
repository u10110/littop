import { createApp } from 'vue';
import { DefaultApolloClient } from '@vue/apollo-composable';

import './style.css';
import './components/styles.css';
import router from './router';
import App from './App.vue';
import { apolloClient } from './lib/apollo.js';

const app = createApp(App);

app.use(router);
app.provide(DefaultApolloClient, apolloClient);
app.mount('#app');
