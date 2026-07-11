import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatContestScope,
  formatContestStatus,
  formatDuration,
  formatWorkSection,
} from './format.js';

test('formatDuration renders mm:ss and safely handles empty values', () => {
  assert.equal(formatDuration(null), '—');
  assert.equal(formatDuration(undefined), '—');
  assert.equal(formatDuration(154), '02:34');
  assert.equal(formatDuration(3723), '62:03');
});

test('formatters map backend enum values to readable russian labels', () => {
  assert.equal(formatWorkSection('poetry'), 'Поэзия');
  assert.equal(formatWorkSection('prose'), 'Проза');
  assert.equal(formatWorkSection('project'), 'Творческий проект');
  assert.equal(formatContestStatus('accepting_entries'), 'Приём работ');
  assert.equal(formatContestStatus('voting'), 'Идёт голосование');
  assert.equal(formatContestStatus('finished'), 'Завершён');
  assert.equal(formatContestScope('site'), 'Конкурс сайта');
  assert.equal(formatContestScope('forum'), 'Форумный конкурс');
});
