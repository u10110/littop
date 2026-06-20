function compareByCreatedAt(left, right) {
  const leftTime = Date.parse(left?.createdAt || '') || 0;
  const rightTime = Date.parse(right?.createdAt || '') || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return Number(left?.id || 0) - Number(right?.id || 0);
}

export function buildThreadTree(items = [], parentKey = 'parentCommentId') {
  const nodes = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        children: [],
        depth: 0,
        replyToAuthor: null,
      }))
    : [];

  const byId = new Map(nodes.map((node) => [String(node.id), node]));
  const roots = [];

  for (const node of nodes) {
    const parentId = node[parentKey] == null ? '' : String(node[parentKey]);
    const parent = parentId ? byId.get(parentId) : null;
    if (parent) {
      node.depth = parent.depth + 1;
      node.replyToAuthor = parent.author || null;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list) => {
    list.sort(compareByCreatedAt);
    for (const item of list) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function flattenThreadTree(items = [], parentKey = 'parentCommentId') {
  const roots = buildThreadTree(items, parentKey);
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
