<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const pages = {
  rubrics: { kicker: 'НАВИГАЦИЯ ПО ТВОРЧЕСТВУ', title: 'Рубрики', lead: 'Выбирай тему точнее — читателям проще найти своё, а автору проще попасть к своей аудитории.', type: 'rubrics' },
  showcase: { kicker: 'ВЫБОР РЕДАКЦИИ', title: 'Крыльцо Литопотама', lead: 'Живые авторы и произведения, которые редакция хочет показать читателям. Подборка обновляется вручную — без накруток и случайного шума.', type: 'showcase' },
  'forum-sections': { kicker: 'СООБЩЕСТВО', title: 'Разделы форума', lead: 'Текущие темы и сообщения остаются на месте. Разделы помогают быстро понять, куда открыть новую тему.', type: 'sections' },
  promotion: { kicker: 'ДОПОЛНИТЕЛЬНЫЕ ВОЗМОЖНОСТИ', title: 'Продвижение автора', lead: 'Существующие функции не закрываются. Это добровольные форматы, чтобы редакция и автор могли точнее показать работу читателям.', type: 'promotion' },
  'editorial-queue': { kicker: 'РАБОЧЕЕ МЕСТО РЕДАКЦИИ', title: 'Редакторская очередь', lead: 'Отбор в витрину и подборки. Это отдельный служебный сценарий: текущая модерация работ не меняется.', type: 'queue' },
};
const page = computed(() => pages[route.meta.referencePage] || pages.rubrics);
const rubricGroups = [['Поэзия', 'Любовная лирика', 'Философская поэзия', 'Гражданская лирика', 'Пейзажная лирика', 'Верлибр и эксперименты', 'Детская поэзия'], ['Проза', 'Рассказ', 'Повесть и роман', 'Эссе и мемуары', 'Фантастика и фэнтези', 'Детектив', 'Историческая проза'], ['Творческие проекты', 'Песни и декламации', 'Интервью', 'Критика и отзывы', 'Литературоведение', 'Аудио-рассказы', 'PDF-книги и журналы']];
const sections = [['Творческая мастерская', 'Разбор работ, советы, конструктивная критика.', '186 тем · последняя сегодня'], ['Колонка редактора', 'Новости площадки, подборки и редакторские заметки.', '42 темы · обновлено вчера'], ['Конкурсы и литературные игры', 'Обсуждение конкурсов, форумные инициативы, дуэли.', '39 тем · 11 новых ответов'], ['Работа сайта', 'Идеи, предложения и сообщения об ошибках.', '27 тем · команда читает'], ['Гуманитарная гостиная', 'Кино, история, философия и разговоры о литературе.', '94 темы'], ['На завалинке', 'Неформальное общение между авторами и читателями.', '73 темы']];
const offers = [['Старт', 'Витрина', '100 🍑', 'Заявка одной работы в витрину', 'Ответ редакции', '7 дней размещения при отборе'], ['Поддержка автора', 'Золотой лист', '400 🍑', 'Приоритетная редакторская проверка', 'Бейдж в профиле на 30 дней', 'Участие в подборке авторов'], ['Для проектов', 'Анонс', '800 🍑', 'Карточка в редакторской колонке', 'Анонс для подписчиков автора', 'Статистика переходов']];
const queue = [['Витрина', 'Красный король', 'Тимур Тамирхан · Проза · заявка сегодня'], ['Анонс', 'Обними меня, ночь', 'Якименко Ира · Творческий проект · заявка вчера'], ['Витрина', 'Памяти В. Высоцкого', 'Виктор Иванович · Поэзия · заявка 05.08.2026']];
</script>

<template>
  <main class="extra-page nested-reference-page"><div class="extra-shell">
    <div class="extra-hero">
        <span>{{ page.kicker }}</span><h1>{{ page.title }}</h1><p>{{ page.lead }}</p>
    </div>
    <template v-if="page.type === 'rubrics'"><section class="rubric-grid"><article v-for="group in rubricGroups" :key="group[0]"><h2>{{ group[0] }}</h2><a v-for="item in group.slice(1)" :key="item" href="#">{{ item }}</a></article></section><p class="reference-note">Новые рубрики добавляются без изменения существующих разделов «Поэзия», «Проза» и «Творческие проекты» — это уточняющий слой каталога.</p></template>
    <template v-else-if="page.type === 'showcase'"><section class="showcase-hero"><div><span>СЕЙЧАС В ВИТРИНЕ</span><ol><li><b>Красный король</b><small>Тимур Тамирхан · проза</small></li><li><b>Обними меня, ночь</b><small>Якименко Ира · творческий проект</small></li><li><b>Памяти В. Высоцкого</b><small>Виктор Иванович · поэзия</small></li></ol><RouterLink class="btn btn-primary" to="/works">Смотреть произведения</RouterLink></div><aside><span>РУЧНАЯ КУРАЦИЯ</span><h2>Авторы, которых стоит открыть</h2><a href="#">01 Светлана Севрикова<small>Поэзия и проза · Москва</small></a><a href="#">02 Тимур Тамирхан<small>Публицистика · 69 рейтинг</small></a><a href="#">03 Якименко Ира<small>Музыка, поэзия · Москва</small></a></aside></section></template>
    <template v-else-if="page.type === 'sections'"><section class="sections-grid"><article v-for="item in sections" :key="item[0]"><span>СООБЩЕСТВО</span><h2>{{ item[0] }}</h2><p>{{ item[1] }}</p><small>{{ item[2] }}</small></article></section><RouterLink class="btn btn-primary section-cta" to="/forum">Перейти к темам форума</RouterLink></template>
    <template v-else-if="page.type === 'promotion'"><section class="offer-grid"><article v-for="item in offers" :key="item[1]"><span>{{ item[0] }}</span><h2>{{ item[1] }}</h2><b>{{ item[2] }}</b><ul><li>{{ item[3] }}</li><li>{{ item[4] }}</li><li>{{ item[5] }}</li></ul><button class="btn btn-primary" type="button">{{ item[1] === 'Витрина' ? 'Подать заявку' : item[1] === 'Золотой лист' ? 'Выбрать' : 'Подробнее' }}</button></article></section><p class="reference-note">Экран показывает продуктовую модель, а не платежную интеграцию. Подключение денег, реклама и покупка персиков требуют отдельного согласования, юридических текстов и backend-реализации.</p></template>
    <template v-else><div class="queue-tabs"><b>Все заявки</b><span>Витрина</span><span>Анонс</span><span>На проверке</span><button>Фильтровать</button></div><section class="queue-list"><article v-for="item in queue" :key="item[1]"><span>{{ item[0] }}</span><div><h2>{{ item[1] }}</h2><p>{{ item[2] }}</p></div><button class="btn btn-outline">Открыть</button></article></section></template>
  </div></main>
</template>
