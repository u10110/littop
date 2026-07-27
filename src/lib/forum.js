import { buildThreadTree, flattenThreadTree } from './discussion.js';
import { linkify, sanitizeRichTextHtml } from './richText.js';

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

// Forum post bodies are plain user text. Make links clickable but never
// inject raw HTML: sanitize first, then linkify the remaining URLs.
function forumRichText(text) {
  return linkify(sanitizeRichTextHtml(text ?? ''));
}

export function buildForumPostTree(posts = [], options = {}) {
  const { processText = forumRichText } = options;
  return buildThreadTree(posts, {
    parentKey: 'parentPostId',
    processText,
  });
}

export function flattenForumPostTree(posts = [], options = {}) {
  const { processText = forumRichText } = options;
  return flattenThreadTree(posts, {
    parentKey: 'parentPostId',
    processText,
  });
}
