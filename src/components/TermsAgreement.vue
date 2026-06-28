<script setup>
import { TERMS_SECTIONS, TERMS_TITLE, TERMS_VERSION } from '../lib/terms.js';
</script>

<template>
  <section class="page-head terms-page">
    <div class="chips">
      <span class="pill">Документ сайта</span>
      <span class="pill">версия {{ TERMS_VERSION }}</span>
    </div>
    <h1>{{ TERMS_TITLE }}</h1>
    <p class="muted">
      Этот текст показывается пользователю перед регистрацией и доступен по прямой ссылке из формы создания аккаунта.
    </p>
  </section>

  <section class="panel stack terms-panel">
    <article v-for="section in TERMS_SECTIONS" :key="section.title" class="stack terms-section">
      <h2>{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs" :key="paragraph">
        {{ paragraph }}
      </p>
    </article>
  </section>
</template>
