import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildForumPostTree,
  buildForumTopicLookupVariables,
  flattenForumPostTree,
  getAuthorDisplayName,
  getAuthorInitial,
} from './forum.js';

test('buildForumTopicLookupVariables resolves numeric id and slug', () => {
  assert.deepEqual(buildForumTopicLookupVariables(' 42 '), { topicId: '42', slug: null });
  assert.deepEqual(buildForumTopicLookupVariables(' lyrical-thread '), { topicId: null, slug: 'lyrical-thread' });
  assert.deepEqual(buildForumTopicLookupVariables(''), { topicId: null, slug: null });
});

test('forum helpers resolve author display name and initial', () => {
  assert.equal(getAuthorDisplayName({ displayName: 'Иван Петров', login: 'ivan' }), 'Иван Петров');
  assert.equal(getAuthorDisplayName({ login: 'ivan' }), 'ivan');
  assert.equal(getAuthorInitial({ displayName: 'Иван Петров' }), 'И');
  assert.equal(getAuthorInitial(null), 'П');
});

test('buildForumPostTree nests replies under parent posts', () => {
  const tree = buildForumPostTree([
    { id: 3, parentPostId: 2, createdAt: '2026-06-19T10:02:00.000Z', author: { login: 'reply-2' } },
    { id: 1, parentPostId: null, createdAt: '2026-06-19T10:00:00.000Z', author: { login: 'root-1' } },
    { id: 2, parentPostId: 1, createdAt: '2026-06-19T10:01:00.000Z', author: { login: 'reply-1' } },
    { id: 4, parentPostId: 999, createdAt: '2026-06-19T10:03:00.000Z', author: { login: 'orphan' } },
  ]);

  assert.equal(tree.length, 2);
  assert.equal(tree[0].id, 1);
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].id, 2);
  assert.equal(tree[0].children[0].children[0].id, 3);
  assert.equal(tree[0].children[0].replyToAuthor.login, 'root-1');
  assert.equal(tree[1].id, 4);
});

test('flattenForumPostTree preserves thread order and depth', () => {
  const flattened = flattenForumPostTree([
    { id: 10, parentPostId: null, createdAt: '2026-06-19T10:00:00.000Z', author: { login: 'root' } },
    { id: 11, parentPostId: 10, createdAt: '2026-06-19T10:01:00.000Z', author: { login: 'child' } },
    { id: 12, parentPostId: 11, createdAt: '2026-06-19T10:02:00.000Z', author: { login: 'grandchild' } },
  ]);

  assert.deepEqual(flattened.map((item) => [item.id, item.depth]), [
    [10, 0],
    [11, 1],
    [12, 2],
  ]);
  assert.equal(flattened[1].replyToAuthor.login, 'root');
  assert.equal(flattened[2].replyToAuthor.login, 'child');
});
