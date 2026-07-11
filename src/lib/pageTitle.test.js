import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPageTitle } from './pageTitle.js';

test('buildPageTitle adds brand suffix', () => {
  assert.equal(buildPageTitle('Форум'), 'Форум — Литопотам');
  assert.equal(buildPageTitle(''), 'Литопотам');
});
