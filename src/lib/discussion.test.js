import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreadTree, flattenThreadTree } from './discussion.js';

test('buildThreadTree nests replies by configurable parent key', () => {
  const tree = buildThreadTree([
    { id: 3, parentCommentId: 2, createdAt: '2026-06-19T10:02:00.000Z', author: { login: 'reply-2' } },
    { id: 1, parentCommentId: null, createdAt: '2026-06-19T10:00:00.000Z', author: { login: 'root-1' } },
    { id: 2, parentCommentId: 1, createdAt: '2026-06-19T10:01:00.000Z', author: { login: 'reply-1' } },
    { id: 4, parentCommentId: 999, createdAt: '2026-06-19T10:03:00.000Z', author: { login: 'orphan' } },
  ], {
    parentKey: 'parentCommentId',
  });

  assert.equal(tree.length, 2);
  assert.equal(tree[0].id, 1);
  assert.equal(tree[0].children[0].id, 2);
  assert.equal(tree[0].children[0].children[0].id, 3);
  assert.equal(tree[0].children[0].replyToAuthor.login, 'root-1');
  assert.equal(tree[1].id, 4);
});

test('flattenThreadTree preserves depth and reply-to author', () => {
  const flattened = flattenThreadTree([
    { id: 10, parentPostId: null, createdAt: '2026-06-19T10:00:00.000Z', author: { login: 'root' } },
    { id: 11, parentPostId: 10, createdAt: '2026-06-19T10:01:00.000Z', author: { login: 'child' } },
    { id: 12, parentPostId: 11, createdAt: '2026-06-19T10:02:00.000Z', author: { login: 'grandchild' } },
  ], {
    parentKey: 'parentPostId',
  });

  assert.deepEqual(flattened.map((item) => [item.id, item.depth]), [
    [10, 0],
    [11, 1],
    [12, 2],
  ]);
  assert.equal(flattened[1].replyToAuthor.login, 'root');
  assert.equal(flattened[2].replyToAuthor.login, 'child');
});
