import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAuthorPageLocation,
  buildWorkPageLocation,
  normalizeRouteParam,
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

test('normalizeRouteParam safely handles arrays and non-strings', () => {
  assert.equal(normalizeRouteParam(' author-login '), 'author-login');
  assert.equal(normalizeRouteParam(['work-slug', 'ignored']), 'work-slug');
  assert.equal(normalizeRouteParam(null), '');
});
