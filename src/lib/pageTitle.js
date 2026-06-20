const BRAND = 'Литопотам';

export function buildPageTitle(title) {
  const normalized = String(title || '').trim();
  return normalized ? `${normalized} — ${BRAND}` : BRAND;
}

export function setDocumentTitle(title) {
  if (typeof document === 'undefined') return;
  document.title = buildPageTitle(title);
}
