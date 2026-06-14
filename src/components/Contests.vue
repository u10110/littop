<template>

    <div>
      <h1>Конкурсы</h1>
      <p class="muted">Подборка текущих конкурсов с litprichal.ru/contest.php и краткие итоги завершённых.</p>
    </div>

    <section>
      <div class="chips">
        <span class="chip">Проводимые</span>
        <span class="chip">Завершённые</span>
      </div>
    </section>

    <section class="section" aria-label="Проводимые конкурсы">
      <h2>Конкурсы сайта</h2>
      <div class="grid">
        <div class="card">
          <div class="title">«Здесь начинается Россия»</div>
          <div class="meta">25.05.2026 — 12.06.2026</div>
          <span class="badge">Идёт голосование</span>
        </div>
        <div class="card">
          <div class="title">«Конкурс декламаций “История любви”»</div>
          <div class="meta">13.05.2026 — 28.06.2026</div>
          <span class="badge">Идёт приём работ</span>
        </div>
      </div>
    </section>

    <section class="section" aria-label="Авторские конкурсы">
      <h2>Авторские конкурсы</h2>
      <p class="muted">Сейчас авторских конкурсов нет.</p>
    </section>

    <section class="section" aria-label="Победители">
      <h2>Победители завершённых</h2>
      <div class="list">
        <div class="rowline"><strong>«Друг человека» (Поэзия)</strong>: 1 место — «О нас так вряд ли...» (Анжела Баер); 2 место — «Недолог век собаки на войне» (Сергей Анашкин); 3 место — «Старым собакам» (Lusia Rozanova).</div>
        <div class="rowline"><strong>«Друг человека» (Проза)</strong>: 1 место — «Собака - подрывник Джульбарс» (Вера Павлова); 2 место — «Герд» (Сергей Богаткин); 3 место — «Как сочинялась опера» (Ольга Зимина).</div>
        <div class="rowline"><strong>«История. События» (Поэзия)</strong>: 1 место — «накануне...» (Дана Верис); 2 место — «Горюн-трава» (Явецкий Павел); 3 место — «Ангелы с чёрными лицами» (Тианна Ридак).</div>
        <div class="rowline"><strong>«История. События» (Проза)</strong>: 1 место — «Трагедия 1969 года» (Сергей НикулинЪ); 2 место — «Точка невозврата» (Даре Мачавариани); 3 место — «Не трогай мою игрушку!» (Сергей Кабских).</div>
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
    main{max-width:1180px;margin:0 auto;padding:20px 16px 56px;display:flex;flex-direction:column;gap:24px;}
    h1{margin:0 0 8px;font-size:1.8rem;} .muted{color:var(--muted);margin:0 0 12px;}
    .chips{display:flex;flex-wrap:wrap;gap:8px;} .chip{padding:8px 12px;border:1px solid var(--border);background:transparent;font-size:0.95rem;}
    .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));}
    .card{border:1px solid var(--border);padding:14px;background:#fafafa;display:flex;flex-direction:column;gap:6px;}
    .title{font-weight:700;} .meta{color:var(--muted);font-size:0.95rem;}
    .badge{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--border);color:var(--muted);font-size:0.85rem;}
    .section{border-top:1px solid var(--border);padding-top:12px;} .section h2{margin:0 0 10px;font-size:1.2rem;}
    .list{display:flex;flex-direction:column;gap:8px;} .rowline{padding:8px 10px;border:1px solid var(--border);background:#fdfdfd;}
  </style>