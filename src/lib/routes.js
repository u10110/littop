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

export function normalizeWorksPage(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildWorksQuery({ section = '', genre = '', search = '', mine = false, today = false, page = 1 } = {}) {
  const query = {};
  if (section) query.section = section;
  if (genre) query.genre = genre;
  if (String(search).trim()) query.search = String(search).trim();
  if (mine) query.mine = '1';
  if (today) query.today = '1';
  if (normalizeWorksPage(page) > 1) query.page = String(normalizeWorksPage(page));
  return query;
}
