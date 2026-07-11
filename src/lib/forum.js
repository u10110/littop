import { buildThreadTree, flattenThreadTree } from './discussion.js';

export function buildForumTopicLookupVariables(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { topicId: null, slug: null };
  }

  if (/^\d+$/.test(normalized)) {
    return { topicId: normalized, slug: null };
  }

  return { topicId: null, slug: normalized };
}

export function getAuthorDisplayName(author) {
  return author?.displayName || author?.login || 'Пользователь';
}

export function getAuthorInitial(author) {
  const source = String(getAuthorDisplayName(author) || '').trim();
  return source ? source[0].toUpperCase() : 'П';
}

export function buildForumPostTree(posts = []) {
  return buildThreadTree(posts, {
    parentKey: 'parentPostId',
  });
}

export function flattenForumPostTree(posts = []) {
  return flattenThreadTree(posts, {
    parentKey: 'parentPostId',
  });
}
