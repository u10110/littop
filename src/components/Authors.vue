<template>


      <div>
        <h1>Авторы</h1>
        <p class="muted">Секция «Авторы» по схеме lit-top.ucoz.site: фильтры, блок с классиками и витрина первых страниц списка авторов с chitalnya.ru/authors.php.</p>
      </div>
  
      <section class="section" aria-label="Фильтр">
        <h2>Фильтр</h2>
        <div class="filters">
          <div class="chip"><strong>По рейтингу</strong></div>
          <div class="chip">По алфавиту</div>
          <div class="chip">По дате регистрации ↑</div>
          <div class="chip">По дате регистрации ↓</div>
          <div class="chip">По количеству произведений</div>
        </div>
      </section>
  
      <section class="section" aria-label="Классики">
        <h2>Классики (витрина)</h2>
        <div class="grid-5">
          <div class="card"><h3>Александр Пушкин</h3><span class="tag">классика</span></div>
          <div class="card"><h3>Александр Блок</h3><span class="tag">классика</span></div>
          <div class="card"><h3>Сергей Есенин</h3><span class="tag">классика</span></div>
          <div class="card"><h3>Булат Окуджава</h3><span class="tag">классика</span></div>
          <div class="card"><h3>Владимир Высоцкий</h3><span class="tag">классика</span></div>
        </div>
        <p class="note" style="margin-top:10px;">Пять слотов под платные анонсы авторских страниц (из исходной схемы).</p>
      </section>
  
      <section class="section" aria-label="Список авторов">
        <h2>Авторы (страница 1 из chitalnya.ru/authors.php)</h2>
        <div class="authors-grid">
          <div class="author"><div class="name">Олег Сталь</div><div class="login">Stan242</div></div>
          <div class="author"><div class="name">Дейв Гахан</div><div class="login">Dave_Gahan</div></div>
          <div class="author"><div class="name">Sergei Небогатый</div><div class="login">the_king_of_words</div></div>
          <div class="author"><div class="name">Виктор Ергин</div><div class="login">ergin</div></div>
          <div class="author"><div class="name">Антон Боровиков</div><div class="login">antonborovikov</div></div>
          <div class="author"><div class="name">Ardak Kassymbek</div><div class="login">Ardak1977</div></div>
          <div class="author"><div class="name">Алевтина Хоментовская</div><div class="login">Alevtina55</div></div>
          <div class="author"><div class="name">Евгений Мирмович</div><div class="login">mirevgvlad@mail.ru</div></div>
          <div class="author"><div class="name">Бабинцева Анна</div><div class="login">Martinova</div></div>
          <div class="author"><div class="name">Кирилл Матюшкин</div><div class="login">Talman27</div></div>
          <div class="author"><div class="name">Литературные презентации</div><div class="login">Dakotov_k</div></div>
          <div class="author"><div class="name">Галина Лебединская</div><div class="login">galina030847</div></div>
          <div class="author"><div class="name">Виталий Гольнев</div><div class="login">golnevv</div></div>
          <div class="author"><div class="name">Сергей Корчагин</div><div class="login">strong47</div></div>
          <div class="author"><div class="name">Ольга Снопова</div><div class="login">olga-snopova</div><div class="meta">Рейтинг: 62</div></div>
          <div class="author"><div class="name">Петровна Краса</div><div class="login">PETROVNA</div><div class="meta">Рейтинг: 6</div></div>
          <div class="author"><div class="name">Света Сантурян</div><div class="login">Sadmelandbanane</div></div>
          <div class="author"><div class="name">Илья Поляков</div><div class="login">Ilyamurmuromec</div></div>
          <div class="author"><div class="name">Kas Aur</div><div class="login">KasaurArt</div></div>
          <div class="author"><div class="name">Станислав Попеляев</div><div class="login">grustniy_poet</div></div>
          <div class="author"><div class="name">Алёна Барбоскина</div><div class="login">kinosshhii</div><div class="meta">Рейтинг: 3</div></div>
        </div>
        <p class="note" style="margin-top:10px;">Пагинация по образцу chitalnya.ru: страницы 1…>…»» (775). Для макета зафиксирована первая страница.</p>
      </section>
  
      <section class="section" id="forum">
        <h2>Форум</h2>
        <p class="note">Заглушка под форумные ссылки (ссылка на ../litop_main/index.html#forum).</p>
      </section>
      <div id="poetry"></div>
      <div id="contests"></div>
      <div id="radio"></div>

</template>

<style>
:root {
  --accent: #b51e1e;
  --text: #111;
  --muted: #666;
  --border: #e1e1e1;
  --bg: #fff;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }
header { border-bottom: 1px solid var(--border); background: #fff; position: sticky; top: 0; z-index: 5; }
.navwrap { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; gap: 12px; }
.logo { font-weight: 800; letter-spacing: 0.02em; }
.nav { display: flex; gap: 10px; flex-wrap: wrap; font-weight: 600; color: var(--muted); }
.nav a { color: inherit; padding: 0 10px; }
.nav a + a { border-left: 1px solid var(--border); padding-left: 14px; margin-left: 6px; }
main { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding: 20px 16px 56px; }
h1 { margin: 0 0 8px; font-size: 1.8rem; letter-spacing: -0.3px; }
.muted { color: var(--muted); margin: 0 0 4px; font-size: 0.98rem; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.chip { border: 1px solid var(--border); padding: 10px 12px; font-size: 0.95rem; text-align: center; }
.chip strong { color: var(--accent); }
.grid-5 { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.card { border: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; gap: 6px; background: #fafafa; }
.card h3 { margin: 0; font-size: 1rem; }
.tag { display: inline-flex; padding: 4px 8px; border: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); }
.authors-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.author { border: 1px solid var(--border); padding: 12px; background: #fdfdfd; display: flex; flex-direction: column; gap: 4px; }
.author .name { font-weight: 600; }
.author .login { color: var(--muted); font-size: 0.92rem; }
.author .meta { color: var(--muted); font-size: 0.9rem; }
.section { border-top: 1px solid var(--border); padding-top: 12px; }
.section h2 { margin: 0 0 10px; font-size: 1.2rem; }
.note { color: var(--muted); font-size: 0.9rem; }
@media (max-width: 640px) {
  body { padding: 24px 16px 40px; }
  .navwrap { flex-direction: column; align-items: flex-start; }
}
</style>