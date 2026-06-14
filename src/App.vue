

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
    <div class="navwrap">
      <div class="logo">Литопотам</div>
      <nav class="nav" aria-label="Меню">
        <a href="/">Главная</a>
        <a href="/works">Произведения</a>
        <a href="/authors">Авторы</a>
        <a href="/contests">Конкурсы</a>
        <a href="/radio">Радио</a>
        <a href="/forum">Форум</a>
      </nav>
      <div class="actions">
        <a class="btn-outline" href="/login">Войти</a>
        <a class="btn-primary" href="/register">Регистрация</a>
      </div>
    </div>
  </header>
  <main>
    
    <router-view />

    <footer class="footer">
      Литопотам — статичный макет на основе контента Избы-Читальни. Разделы, форум, конкурсы и радио — ссылки ведут на локально сохранённые копии источника.
    </footer>
  </main>
</body>
</html>

</template>
