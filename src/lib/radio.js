import {
  buildAuthHeaders,
  getGraphqlEndpoint,
  getStoredToken,
  resolveBackendBaseUrl,
} from './auth.js';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать аудиофайл.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.replace(/^data:[^;]+;base64,/i, '');
}

export function filenameToTrackTitle(filename) {
  return String(filename || '')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export function probeAudioDuration(file) {
  return new Promise((resolve) => {
    if (!(file instanceof File)) {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(value) && value >= 0 ? Math.round(value) : null);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(null);
    audio.src = objectUrl;
  });
}

export async function uploadRadioTrack({
  title,
  file,
  authorName = '',
  durationSeconds = null,
  graphqlEndpoint = getGraphqlEndpoint(),
  token = getStoredToken(),
} = {}) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    throw new Error('Название аудио обязательно.');
  }
  if (!(file instanceof File)) {
    throw new Error('Выбери аудиофайл.');
  }
  if (!token) {
    throw new Error('Для загрузки аудио нужен вход в аккаунт.');
  }

  const backendBaseUrl = resolveBackendBaseUrl(graphqlEndpoint);
  const response = await fetch(`${backendBaseUrl}/radio/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({
      title: normalizedTitle,
      authorName: String(authorName || '').trim(),
      fileName: file.name,
      mimeType: file.type || '',
      contentBase64: await fileToBase64(file),
      durationSeconds,
    }),
  });

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || rawText || 'Не удалось загрузить аудио.');
  }

  return payload?.track ?? null;
}
