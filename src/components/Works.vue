<template>
    <!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Литопотам — литературная соцсеть</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body id="top">
  <header>
    <div class="navbar">
      <div class="logo">Литопотам</div>
      <nav class="nav" aria-label="Основное меню">
        <a href="/">Главная</a>
        <a href="/works">Произведения</a>
        <a href="/authors">Авторы</a>
        <a href="/contest">Конкурсы</a>
        <a href="/radio">Радио</a>
        <a href="/forum">Форум</a>
      </nav>
      <div class="actions">
        <a class="btn-outline" href="#authors">Войти</a>
        <a class="btn-primary" href="#authors">Регистрация</a>
      </div>
    </div>
  </header>
  <main>
  <section class="hero">
    <h1>Литопотам — писать, читать, оценивать</h1>
    <p>Регистрация для авторов, публикация стихов, прозы и проектов. Оценки и комментарии от читателей. Форум для живого общения.</p>
  </section>

  <div id="links"></div>

  <section class="section" id="poetry">
    <h2>Произведения</h2>

    <p class="muted">Свежие подборки и рубрики из Избы-Читальни.</p>
    <div class="grid">
      <div class="card">
        <h3>Подборки</h3>
        <div class="chips">
          <span class="chip">Стихи за сегодня</span>
          <span class="chip">Все стихи</span>
          <span class="chip">Авторы рекомендуют</span>
          <span class="chip">Рекомендованные стихи</span>
        </div>
      </div>
      <div class="card">
        <h3>Рубрики</h3>
        <ul>
          <li>Акростихи, Басни, Белый стих</li>
          <li>Лирика любовная, пейзажная, гражданская</li>
          <li>Пародии, Подражания, Верлибр</li>
          <li>Поэмы и циклы, Поэтические манифесты</li>
          <li>Стихи с видео, Стихи в прозе, Детские</li>
        </ul>
      </div>
      <div class="card">
        <h3>Быстрые ссылки</h3>
        <div class="list">
          <div class="list-item"><span class="title">Стихи за сегодня</span><div class="meta">https://www.chitalnya.ru/poetrylist.php</div></div>
          <div class="list-item"><span class="title">Все стихи</span><div class="meta">https://www.chitalnya.ru/stihi.php</div></div>
          <div class="list-item"><span class="title">Авторы рекомендуют</span><div class="meta">https://www.chitalnya.ru/promotion.php</div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="prose">
    <h2>Проза</h2>
    <p class="muted">Ключевые рубрики и подборки.</p>
    <div class="grid">
      <div class="card">
        <h3>Подборки</h3>
        <div class="chips">
          <span class="chip">Проза за сегодня</span>
          <span class="chip">Вся проза</span>
        </div>
      </div>
      <div class="card">
        <h3>Рубрики</h3>
        <ul>
          <li>Антиутопия, Детектив, Исторический роман</li>
          <li>Любовная литература, Мемуары, Миниатюра</li>
          <li>Мистика, Новеллы, Остросюжетная литература</li>
          <li>Психологический роман, Фантастика, Фэнтези</li>
          <li>Эссе, Юмор, Детская литература</li>
        </ul>
      </div>
      <div class="card">
        <h3>Быстрые ссылки</h3>
        <div class="list">
          <div class="list-item"><span class="title">Проза за сегодня</span><div class="meta">https://www.chitalnya.ru/proselist.php</div></div>
          <div class="list-item"><span class="title">Вся проза</span><div class="meta">https://www.chitalnya.ru/prose.php</div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="projects">
    <h2>Творческие проекты</h2>
    <p class="muted">Песни, презентации, постановки, киносценарии.</p>
    <div class="card">
      <div class="chips">
        <span class="chip">Песня</span>
        <span class="chip">Презентация</span>
        <span class="chip">Постановка</span>
        <span class="chip">Киносценарий</span>
      </div>
      <p class="muted" style="margin-top:12px;">Выгружено из раздела "Творческие проекты" (пример слайдов на lit-top.ucoz.site).</p>
    </div>
  </section>

  <section class="section" id="forum">
    <h2>Форум (Творческая мастерская)</h2>
    <p class="muted">Свежие темы из Избы-Читальни, кратко.</p>
    <div class="twocol">
      <ul class="list">
        <li class="list-item">
          <div class="title">Свои причины промолчать (ТМ)</div>
          <div class="meta">Lone Traveler — 06.05.2026</div>
        </li>
        <li class="list-item">
          <div class="title">Мальчик - (Т.М.)</div>
          <div class="meta">Давид — 09.05.2026</div>
        </li>
      </ul>
      <ul class="list">
        <li class="list-item">
          <div class="title">В роще (ТМ)</div>
          <div class="meta">Куратор ТМ — 08.05.2026</div>
        </li>
        <li class="list-item">
          <div class="title">Сочится жизнь (ТМ)</div>
          <div class="meta">lf — 13.04.2026</div>
        </li>
      </ul>
      <ul class="list">
        <li class="list-item">
          <div class="title">Последний день Трудоголикова..</div>
          <div class="meta">Астсергей — 15.04.2026</div>
        </li>
        <li class="list-item">
          <div class="title">Три куста (ТМ)</div>
          <div class="meta">lf — 06.04.2026</div>
        </li>
      </ul>
    </div>
    <p class="muted" style="margin-top:10px;">Полная копия темы доступна в локальном форуме: <code>../lit-top.ucoz.site/forum-izba.html</code>.</p>
  </section>

  <section class="section" id="contests">
    <h2>Конкурсы</h2>
    <p class="muted">Из блока "Конкурсы" на chitalnya.ru.</p>
    <div class="grid">
      <div class="card">
        <img class="contest-img" src="../source_pages/www.chitalnya.ru/upload/960/c3767bc0e640c7ce33ee51d9413d05f2.jpg" alt="Поле ромашек" />
        <h3>Конкурсы от "КЛиК"</h3>
        <p class="muted">Из раздела users/contest</p>
      </div>
      <div class="card">
        <img class="contest-img" src="../source_pages/www.chitalnya.ru/cache_image/3a/3a0bb9d12be6a2f3c10d37dfd1a46969.jpg" alt="Плакат С Днём России" />
        <h3>Ежегодный кубок</h3>
        <p class="muted">Из «Избы-Читальни», users/cup.izba</p>
      </div>
      <div class="card">
        <img class="contest-img" src="../source_pages/www.chitalnya.ru/cache_image/c0/c07d65f7aae5e4125586c64eea8faaa9.jpg" alt="Дорога к воронке в небе" />
        <h3>Конкурсы на форуме</h3>
        <p class="muted">Ветка forum.php?t=13</p>
      </div>
    </div>
  </section>

  <section class="section" id="radio">
    <h2>Радио</h2>
    <p class="muted">Ссылка на локальную копию радио-страницы chitalnya.ru/radio/.</p>
    <div class="card">
      <div class="list-item" style="border:none; padding:0;">
        <div class="title">Онлайн-плеер и чат</div>
        <div class="meta">Файлы сохранены в ../source_pages/www.chitalnya.ru/radio/</div>
        <div style="margin-top:8px;">
          <a class="btn" href="../source_pages/www.chitalnya.ru/radio/index.html">Открыть радио</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="authors">
    <h2>Авторы</h2>
    <p class="muted">Список и витрина авторов из блока "Новые авторы".</p>
    <div class="card">
      <ul class="list">
        <li class="list-item"><div class="title">Леон Ле</div></li>
        <li class="list-item"><div class="title">Тимру Тамирхан</div></li>
        <li class="list-item"><div class="title">Татьяна Кувшиновская</div></li>
        <li class="list-item"><div class="title">Константин Клюев</div></li>
        <li class="list-item"><div class="title">Николай Гумилёв</div></li>
        <li class="list-item"><div class="title">Владимир Маяковский</div></li>
      </ul>
    </div>
  </section>

  <section class="section">
    <h2>Виджеты и авторизация</h2>
    <div class="grid">
      <div class="card">
        <h3>Регистрация</h3>
        <p class="muted">Вход/регистрация вынесены в шапку — лёгкий доступ.</p>
        <div class="chips">
          <span class="chip">Регистрация</span>
          <span class="chip">Вход</span>
          <span class="chip">Профиль</span>
        </div>
      </div>
      <div class="card">
        <h3>Оценки и комментарии</h3>
        <p class="muted">Модель: оценка произведения и комментарии читателей.</p>
      </div>
      <div class="card">
        <h3>Форум-доска</h3>
        <p class="muted">Быстрый обмен сообщениями и темами вне произведений.</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    Литопотам — статичный макет на основе контента Избы-Читальни. Разделы, форум, конкурсы и радио — ссылки ведут на локально сохранённые копии источника.
  </footer>
  </main>
</body>
</html>

    </template>