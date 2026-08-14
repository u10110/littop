import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAuthorPageLocation,
  buildForumTopicPageLocation,
  buildWorkPageLocation,
  normalizeRouteParam,
  normalizeWorksPage,
  buildWorksQuery,
} from './routes.js';

test('buildAuthorPageLocation builds public author route from object or raw login', () => {
  assert.deepEqual(buildAuthorPageLocation({ login: 'poet-ivan' }), {
    name: 'author-public',
    params: { login: 'poet-ivan' },
  });

  assert.deepEqual(buildAuthorPageLocation('  poet-anna  '), {
    name: 'author-public',
    params: { login: 'poet-anna' },
  });

  assert.deepEqual(buildAuthorPageLocation(''), { name: 'authors' });
});

test('buildWorkPageLocation prefers slug and falls back to id', () => {
  assert.deepEqual(buildWorkPageLocation({ slug: 'moon-river-123', id: 41 }), {
    name: 'work-public',
    params: { slugOrId: 'moon-river-123' },
  });

  assert.deepEqual(buildWorkPageLocation({ id: 41 }), {
    name: 'work-public',
    params: { slugOrId: '41' },
  });

  assert.deepEqual(buildWorkPageLocation('  my-slug  '), {
    name: 'work-public',
    params: { slugOrId: 'my-slug' },
  });
});

test('buildForumTopicPageLocation prefers slug and falls back to id', () => {
  assert.deepEqual(buildForumTopicPageLocation({ slug: 'poetry-thread-7', id: 7 }), {
    name: 'forum-topic-public',
    params: { slugOrId: 'poetry-thread-7' },
  });

  assert.deepEqual(buildForumTopicPageLocation({ id: 7 }), {
    name: 'forum-topic-public',
    params: { slugOrId: '7' },
  });

  assert.deepEqual(buildForumTopicPageLocation(''), { name: 'forum' });
});

test('normalizeWorksPage and buildWorksQuery keep catalog URLs deterministic', () => {
  assert.equal(normalizeWorksPage('3'), 3);
  assert.equal(normalizeWorksPage('0'), 1);
  assert.equal(normalizeWorksPage('invalid'), 1);

  assert.deepEqual(buildWorksQuery({ section: 'poetry', genre: 'lyric', search: '  луна ', mine: true, today: true, page: 3 }), {
    section: 'poetry',
    genre: 'lyric',
    search: 'луна',
    mine: '1',
    today: '1',
    page: '3',
  });
  assert.deepEqual(buildWorksQuery(), {});
});
test('normalizeRouteParam safely handles arrays and non-strings', () => {
  assert.equal(normalizeRouteParam(' author-login '), 'author-login');
  assert.equal(normalizeRouteParam(['work-slug', 'ignored']), 'work-slug');
  assert.equal(normalizeRouteParam(null), '');
});
