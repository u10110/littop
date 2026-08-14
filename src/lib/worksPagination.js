export function buildWorksPagination({ page = 1, pageSize = 24, items = [] } = {}) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const visibleItems = Array.isArray(items) ? items.slice(0, pageSize) : [];
  const hasNext = Array.isArray(items) && items.length > pageSize;

  return {
    items: visibleItems,
    hasPrevious: normalizedPage > 1,
    hasNext,
    isInvalidPage: normalizedPage > 1 && visibleItems.length === 0,
  };
}
