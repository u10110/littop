const RUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{16,}$/;
const VK_EMBED_HOSTS = new Set(['vk.com', 'www.vk.com', 'vkvideo.ru', 'www.vkvideo.ru']);

function extractEmbedSource(value) {
  const input = String(value || '').trim();
  if (!/^<iframe\b/i.test(input)) return input;
  const src = input.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  return src?.[1] || src?.[2] || src?.[3] || '';
}

function parseHttpsUrl(value) {
  try {
    const url = new URL(extractEmbedSource(value));
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function isAllowedVideoEmbedUrl(value) {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  if (url.hostname === 'rutube.ru' || url.hostname === 'www.rutube.ru') {
    return /^\/play\/embed\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
  }
  return VK_EMBED_HOSTS.has(url.hostname) && url.pathname === '/video_ext.php'
    && Boolean(url.searchParams.get('oid'))
    && Boolean(url.searchParams.get('id'))
    && Boolean(url.searchParams.get('hash'));
}

export function normalizeVideoEmbedUrl(value) {
  const url = parseHttpsUrl(value);
  if (!url) throw new Error('Поддерживаются только видео VK Видео или Rutube.');

  if (url.hostname === 'rutube.ru' || url.hostname === 'www.rutube.ru') {
    const match = url.pathname.match(/^\/(?:video|play\/embed)\/([a-zA-Z0-9_-]+)\/?$/);
    if (match && RUTUBE_VIDEO_ID.test(match[1])) return `https://rutube.ru/play/embed/${match[1]}`;
  }

  if (isAllowedVideoEmbedUrl(url.href)) return url.href;
  if (VK_EMBED_HOSTS.has(url.hostname)) {
    throw new Error('Для VK Видео вставьте «Код для вставки» (ссылку video_ext.php с hash).');
  }
  throw new Error('Поддерживаются только видео VK Видео или Rutube.');
}
