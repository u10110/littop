<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import bookFog from '../assets/new-reference/book-fog.jpg';
import bookRiver from '../assets/new-reference/book-river.jpg';
import bookWind from '../assets/new-reference/book-wind.jpg';
import authorAnna from '../assets/new-reference/author-anna.jpg';
import authorMaria from '../assets/new-reference/author-maria.jpg';
import authorAlexey from '../assets/new-reference/author-alexey.jpg';

const route = useRoute();
const assets = { bookFog, bookRiver, bookWind, authorAnna, authorMaria, authorAlexey };
const pages = {
  activity: { kicker: 'СООБЩЕСТВО', title: 'Новости и активность', lead: 'Публикации, конкурсы, литературные встречи и всё важное в сообществе.', type: 'activity-showcase', items: [
    ['СЕГОДНЯ · РЕДАКЦИЯ', 'Открыт приём работ на осенний конкурс рассказов', 'Тема сезона — «Город, которого нет». Условия, сроки и советы редакции.'],
    ['18 ИЮЛ · СООБЩЕСТВО', 'Новые авторы недели: пять страниц, которые стоит открыть', 'Подборка дебютов, отзывов и заметок от читателей.'],
    ['16 ИЮЛ · ВСТРЕЧИ', 'Литературный вечер: разговор о поэзии и памяти', 'Запись эфира и материалы для участников уже доступны.'],
  ] },
  reviews: { kicker: 'ЧИТАТЕЛЬСКАЯ', title: 'Отзывы и рецензии', lead: 'Вдумчивые тексты о произведениях авторов Littop. Читайте, обсуждайте и оставляйте своё мнение.', type: 'reviews', items: [
    ['РЕЦЕНЗИЯ НА «СКВОЗЬ ТУМАН»', 'Тишина, в которой слышно главное', 'Очень точный и бережный текст о памяти. Автору удалось дать читателю прожить чувства вместе с героями.', 'bookFog'],
    ['РЕЦЕНЗИЯ НА «ТЕНИ ПРОШЛОГО»', 'Когда сюжет становится разговором', 'Интрига держится до последней страницы, но самое ценное здесь — интонация и живые детали.', 'bookRiver'],
    ['РЕЦЕНЗИЯ НА «ДЕТИ У ОЗЕРА»', 'Тёплая история о взрослении', 'Книга оставляет ощущение летнего вечера и желания перечитать отдельные главы.', 'bookWind'],
  ] },
  albums: { kicker: 'СООБЩЕСТВО', title: 'Фотоальбомы', lead: 'Моменты литературной жизни: встречи, чтения, рабочие столы авторов и любимые книги.', type: 'albums', items: [
    ['Литературный вечер на Патриарших', 'Мария Иванова · 24 фото', 'bookFog'], ['Книги, которые читаем летом', 'Анна Ветрова · 18 фото', 'bookRiver'], ['За кулисами конкурса рассказов', 'Редакция Littop · 32 фото', 'bookWind'], ['Мой рабочий стол', 'Юрий Митченко · 12 фото', 'bookRiver'], ['Поэзия в городе', 'Светлана С. · 16 фото', 'bookFog'], ['Читательский клуб', 'Алексей И. · 21 фото', 'bookWind'],
  ] },
  blogs: { kicker: 'СООБЩЕСТВО', title: 'Блоги пользователей', lead: 'Личные заметки авторов: о книгах, работе над текстом, вдохновении и том, что остаётся за страницей.', type: 'blogs', items: [
    ['АННА ВЕТРОВА · СЕГОДНЯ, 12:30', 'Как я возвращаюсь к рукописи после паузы', 'Иногда достаточно перечитать несколько страниц и перестать требовать от текста идеального первого шага.', 'authorAnna'],
    ['ЮРИЙ МИТЧЕНКО · ВЧЕРА, 19:10', 'Три вопроса, которые я задаю каждой главе', 'О темпе, голосе героя и том самом предложении, после которого хочется читать дальше.', 'authorAlexey'],
    ['МАРИЯ ИВАНОВА · 11.07.2026', 'Книги июля и маленькие читательские открытия', 'Собрала истории, о которых хочется говорить с друзьями ещё долго после финала.', 'authorMaria'],
  ] },
  about: { kicker: 'LITTOP', title: 'Литература без границ', lead: 'Место, где авторы находят читателей, а читатели — новые голоса и истории, которые остаются с ними надолго.', type: 'about' },
  contacts: { kicker: 'СВЯЗЬ С НАМИ', title: 'Контакты', lead: 'Подскажем по публикации, работе сайта, партнёрствам и редакционным проектам.', type: 'contacts' },
};
const page = computed(() => pages[route.meta.referencePage] || pages.activity);
function openRegistration() {
  window.dispatchEvent(new CustomEvent('littop:open-auth', { detail: { mode: 'register' } }));
}
</script>

<template>
  <main class="extra-page nested-reference-page"><div class="extra-shell"><nav class="subnav nested-subnav" aria-label="Навигация раздела"><RouterLink to="/showcase">Витрина</RouterLink><RouterLink to="/rubrics">Рубрики</RouterLink><RouterLink to="/forum-sections">Разделы форума</RouterLink><RouterLink to="/personal">Страница автора</RouterLink><RouterLink to="/personal">Мой кабинет</RouterLink><RouterLink to="/promotion">Продвижение</RouterLink><RouterLink to="/editorial-queue">Редакция</RouterLink></nav>
    <header v-if="page.type !== 'activity-showcase'" class="extra-hero"><span>{{ page.kicker }}</span><h1>{{ page.title }}</h1><p>{{ page.lead }}</p></header>
    <template v-if="page.type === 'activity-showcase'"><section class="activity-showcase"><article class="activity-feature-card"><span class="catalog-kicker">ГЛАВНОЕ В СООБЩЕСТВЕ</span><h1>{{ page.title }}</h1><p>{{ page.lead }}</p><div class="activity-feature-story"><small>{{ page.items[0][0] }}</small><h2>{{ page.items[0][1] }}</h2><p>{{ page.items[0][2] }}</p></div><RouterLink class="btn btn-outline" to="/contests">Открыть конкурс</RouterLink></article><aside class="activity-panel-card"><span class="catalog-kicker">СЕГОДНЯ НА LITTOP</span><h2>В фокусе редакции</h2><ol><li v-for="(item, index) in page.items" :key="item[1]"><b>0{{ index + 1 }}</b><div><strong>{{ item[1] }}</strong><small>{{ item[0] }}</small></div></li></ol><RouterLink to="/works">Все произведения →</RouterLink></aside></section><section class="activity-curation"><article v-for="(item, index) in page.items" :key="item[1]" class="activity-curation-card"><span>0{{ index + 1 }}</span><small>{{ item[0] }}</small><h2>{{ item[1] }}</h2><p>{{ item[2] }}</p><a href="#">Подробнее →</a></article></section></template>
    <template v-else-if="page.type === 'about'"><section class="about-hero"><button class="btn btn-primary" type="button" @click="openRegistration">Стать частью сообщества</button></section><section class="about-values"><article><b>01</b><h2>Публикуйтесь</h2><p>Создавайте авторскую страницу и собирайте свою библиотеку.</p></article><article><b>02</b><h2>Общайтесь</h2><p>Получайте отзывы и находите единомышленников.</p></article><article><b>03</b><h2>Развивайтесь</h2><p>Конкурсы и редакционные подборки помогают тексту стать заметнее.</p></article></section><section class="about-story"><div><span>НАША ИДЕЯ</span><h2>Хорошая литература начинается с честного диалога</h2><p>Littop объединяет независимых авторов, редакторов и читателей. Здесь ценят внимательное чтение, уважительный разговор и литературные эксперименты.</p></div><aside><b>12 000+</b><small>авторов и читателей</small><b>38 000+</b><small>опубликованных произведений</small></aside></section></template>
    <template v-else-if="page.type === 'contacts'"><section class="contacts-grid"><div class="contact-cards"><article><b>Поддержка авторов</b><a href="mailto:support@littop.ru">support@littop.ru</a><p>Вопросы о публикации, профиле и технических возможностях.</p></article><article><b>Редакция</b><a href="mailto:editor@littop.ru">editor@littop.ru</a><p>Предложения, подборки и редакционные проекты.</p></article><article><b>Партнёрства</b><a href="mailto:hello@littop.ru">hello@littop.ru</a><p>Коллаборации, мероприятия и специальные проекты.</p></article></div><form class="contact-form" @submit.prevent><h2>Написать сообщение</h2><label>Ваше имя<input></label><label>E-mail<input type="email"></label><label>Тема<select><option>Выберите тему обращения</option><option>Поддержка</option><option>Редакция</option></select></label><label>Сообщение<textarea></textarea></label><button class="btn btn-primary">Отправить сообщение</button></form></section></template>
    <template v-else-if="page.type === 'albums'"><div class="album-tools"><b>Все альбомы</b><span>Новые</span><span>Популярные</span><button class="btn btn-primary">＋ Создать альбом</button></div><section class="album-grid"><article v-for="item in page.items" :key="item[0]"><img :src="assets[item[2]]" :alt="item[0]"><div><h2>{{ item[0] }}</h2><p>{{ item[1] }}</p></div></article></section></template>
    <section v-else class="extra-grid"><div :class="page.type === 'reviews' ? 'review-list' : page.type === 'blogs' ? 'blog-list' : 'feed-list'"><div v-if="page.type === 'reviews'" class="review-filter"><b>Все рецензии</b><span>Новые</span><span>Популярные</span></div><article v-for="item in page.items" :key="item[1]" :class="page.type === 'reviews' ? 'review-card' : page.type === 'blogs' ? 'blog-card' : 'feed-card'"><img v-if="page.type === 'reviews' || page.type === 'blogs'" :src="assets[item[3]]" alt=""><div v-else class="feed-date">{{ item[0].slice(0, 2) }}</div><div><small>{{ item[0] }}</small><h2>{{ item[1] }}</h2><p>{{ item[2] }}</p><footer v-if="page.type === 'reviews'">Читать рецензию <span>♡ 24</span></footer><a v-else href="#">Подробнее →</a></div></article></div><aside class="extra-side"><section><h3>{{ page.type === 'blogs' ? 'Популярные блогеры' : 'Популярное сейчас' }}</h3><a href="#">Конкурс «Лето на даче»<small>128 обсуждений</small></a><a href="#">Как найти читателя?<small>96 обсуждений</small></a></section><section><h3>{{ page.type === 'blogs' ? 'О блогах' : 'Подписка на новости' }}</h3><p>{{ page.type === 'blogs' ? 'Ведите дневник автора, делитесь мыслями и находите свою аудиторию.' : 'Одно письмо в неделю — только важное.' }}</p><button class="btn btn-primary">{{ page.type === 'blogs' ? 'Начать блог' : 'Подписаться' }}</button></section></aside></section>
  </div></main>
</template>
