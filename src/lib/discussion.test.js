import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreadTree, flattenThreadTree } from './discussion.js';

test('buildThreadTree nests replies by parentCommentId', () => {
  const tree = buildThreadTree([
    { id: 3, parentCommentId: 2, createdAt: '2026-06-20T10:02:00.000Z', author: { login: 'child-2' } },
    { id: 1, parentCommentId: null, createdAt: '2026-06-20T10:00:00.000Z', author: { login: 'root' } },
    { id: 2, parentCommentId: 1, createdAt: '2026-06-20T10:01:00.000Z', author: { login: 'child-1' } },
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].id, 1);
  assert.equal(tree[0].children[0].id, 2);
  assert.equal(tree[0].children[0].children[0].id, 3);
  assert.equal(tree[0].children[0].replyToAuthor.login, 'root');
});

test('flattenThreadTree preserves depth for nested comments', () => {
  const items = flattenThreadTree([
    { id: 10, parentCommentId: null, createdAt: '2026-06-20T10:00:00.000Z', author: { login: 'root' } },
    { id: 11, parentCommentId: 10, createdAt: '2026-06-20T10:01:00.000Z', author: { login: 'child' } },
    { id: 12, parentCommentId: 11, createdAt: '2026-06-20T10:02:00.000Z', author: { login: 'grandchild' } },
  ]);

  assert.deepEqual(items.map((item) => [item.id, item.depth]), [
    [10, 0],
    [11, 1],
    [12, 2],
  ]);
  assert.equal(items[2].replyToAuthor.login, 'child');
});
