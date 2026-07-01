export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeRichTextHtml(value) {
  const raw = String(value ?? '');
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/ on[a-z]+=("[^"]*"|'[^']*'|[^ >]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function isRichTextEmpty(value) {
  return !stripHtml(value);
}

export function renderRichTextHtml(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return sanitizeRichTextHtml(raw);
  }
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
}
