<template>

    <div>
      <h1>Форум</h1>
      <p class="muted">Свежие темы и авторские обсуждения. Макет в едином стиле с другими страницами.</p>
    </div>

    <section>
      <div class="chips">
        <span class="chip">Творческая мастерская</span>
        <span class="chip">Общие обсуждения</span>
        <span class="chip">Критика и отзывы</span>
        <span class="chip">Публикации и анонсы</span>
      </div>
    </section>

    <section>
      <h2 style="margin:0 0 10px;font-size:1.2rem;">Свежие темы</h2>
      <div class="grid">
        <div class="card">
          <div class="title">Свои причины промолчать (ТМ)</div>
          <div class="meta">Lone Traveler · 06.05.2026 · ответов: 14 · просмотров: 320</div>
          <div class="tags"><span class="tag">ТМ</span><span class="tag">Критика</span></div>
        </div>
        <div class="card">
          <div class="title">Мальчик — (Т.М.)</div>
          <div class="meta">Давид · 09.05.2026 · ответов: 8 · просмотров: 180</div>
          <div class="tags"><span class="tag">ТМ</span><span class="tag">Поэзия</span></div>
        </div>
        <div class="card">
          <div class="title">В роще (ТМ)</div>
          <div class="meta">Куратор ТМ · 08.05.2026 · ответов: 12 · просмотров: 210</div>
          <div class="tags"><span class="tag">ТМ</span><span class="tag">Лирика</span></div>
        </div>
        <div class="card">
          <div class="title">Сочится жизнь (ТМ)</div>
          <div class="meta">lf · 13.04.2026 · ответов: 6 · просмотров: 95</div>
          <div class="tags"><span class="tag">ТМ</span><span class="tag">Авторская</span></div>
        </div>
        <div class="card">
          <div class="title">Последний день Трудоголикова</div>
          <div class="meta">Астсергей · 15.04.2026 · ответов: 11 · просмотров: 150</div>
          <div class="tags"><span class="tag">Проза</span><span class="tag">Обсуждение</span></div>
        </div>
        <div class="card">
          <div class="title">Три куста (ТМ)</div>
          <div class="meta">lf · 06.04.2026 · ответов: 4 · просмотров: 70</div>
          <div class="tags"><span class="tag">ТМ</span><span class="tag">Критика</span></div>
        </div>
      </div>
    </section>

    <section>
      <h2 style="margin:0 0 10px;font-size:1.2rem;">Быстрые ссылки</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));">
        <div class="card"><div class="title">Творческая мастерская</div><div class="meta">forum.php?t=2</div></div>
        <div class="card"><div class="title">Редакция сайта</div><div class="meta">/redaction.php</div></div>
        <div class="card"><div class="title">Авторы декады</div><div class="meta">/decade.php</div></div>
        <div class="card"><div class="title">Отзывы</div><div class="meta">/board/</div></div>
      </div>
    </section>

</template> 

<style>
    :root { --bg:#fff; --text:#111; --muted:#666; --border:#e0e0e0; }
    *{box-sizing:border-box;}
    body{margin:0;font-family:"Inter","Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}
    a{color:inherit;text-decoration:none;} a:hover{text-decoration:underline;}
    header{border-bottom:1px solid var(--border);background:#fff;position:sticky;top:0;z-index:5;}
    .navwrap{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:12px;}
    .logo{font-weight:800;letter-spacing:0.02em;}
    .nav{display:flex;gap:10px;flex-wrap:wrap;font-weight:600;color:var(--muted);} .nav a{padding:0 10px;color:inherit;} .nav a + a{border-left:1px solid var(--border);padding-left:14px;margin-left:6px;}
    main{max-width:1180px;margin:0 auto;padding:20px 16px 56px;display:flex;flex-direction:column;gap:20px;}
    h1{margin:0 0 8px;font-size:1.8rem;} .muted{color:var(--muted);margin:0 0 12px;}
    .chips{display:flex;flex-wrap:wrap;gap:8px;} .chip{padding:8px 12px;border:1px solid var(--border);background:transparent;font-size:0.95rem;}
    .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));}
    .card{border:1px solid var(--border);padding:12px;background:#fafafa;display:flex;flex-direction:column;gap:6px;}
    .title{font-weight:700;font-size:1rem;} .meta{color:var(--muted);font-size:0.93rem;}
    .tags{display:flex;flex-wrap:wrap;gap:6px;} .tag{padding:4px 8px;border:1px solid var(--border);font-size:0.85rem;color:var(--muted);}
  </style>