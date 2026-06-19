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

function compareByCreatedAt(left, right) {
  const leftTime = Date.parse(left?.createdAt || '') || 0;
  const rightTime = Date.parse(right?.createdAt || '') || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return Number(left?.id || 0) - Number(right?.id || 0);
}

export function buildForumPostTree(posts = []) {
  const nodes = Array.isArray(posts)
    ? posts.map((post) => ({
        ...post,
        children: [],
        depth: 0,
        replyToAuthor: null,
      }))
    : [];

  const byId = new Map(nodes.map((node) => [String(node.id), node]));
  const roots = [];

  for (const node of nodes) {
    const parentId = node.parentPostId == null ? '' : String(node.parentPostId);
    const parent = parentId ? byId.get(parentId) : null;
    if (parent) {
      node.depth = parent.depth + 1;
      node.replyToAuthor = parent.author || null;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items) => {
    items.sort(compareByCreatedAt);
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function flattenForumPostTree(posts = []) {
  const roots = buildForumPostTree(posts);
  const flattened = [];

  const visit = (node) => {
    flattened.push(node);
    for (const child of node.children) {
      visit(child);
    }
  };

  for (const root of roots) {
    visit(root);
  }

  return flattened;
}
