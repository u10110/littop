export function buildAuthorPageLocation(authorOrLogin) {
  const login = typeof authorOrLogin === 'string'
    ? authorOrLogin.trim()
    : String(authorOrLogin?.login ?? '').trim();

  if (!login) {
    return { name: 'authors' };
  }

  return {
    name: 'author-public',
    params: { login },
  };
}

export function buildForumTopicPageLocation(topicOrSlug) {
  const slugOrId = typeof topicOrSlug === 'string'
    ? topicOrSlug.trim()
    : String(topicOrSlug?.slug || topicOrSlug?.id || '').trim();

  if (!slugOrId) {
    return { name: 'forum' };
  }

  return {
    name: 'forum-topic-public',
    params: { slugOrId },
  };
}

export function buildWorkPageLocation(workOrSlug) {
  const slugOrId = typeof workOrSlug === 'string'
    ? workOrSlug.trim()
    : String(workOrSlug?.slug || workOrSlug?.id || '').trim();

  if (!slugOrId) {
    return { name: 'works' };
  }

  return {
    name: 'work-public',
    params: { slugOrId },
  };
}

export function normalizeRouteParam(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0].trim() : '';
  }
  return typeof value === 'string' ? value.trim() : '';
}
