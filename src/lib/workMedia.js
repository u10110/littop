import {
  buildAuthHeaders,
  getGraphqlEndpoint,
  getStoredToken,
  resolveBackendBaseUrl,
} from './auth.js';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

async function defaultFileToBase64(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.replace(/^data:[^;]+;base64,/i, '');
}

export async function uploadWorkImage({
  file,
  graphqlEndpoint = getGraphqlEndpoint(),
  token = getStoredToken(),
  fileToBase64 = defaultFileToBase64,
} = {}) {
  if (!(file instanceof File)) {
    throw new Error('Выбери изображение.');
  }
  if (!String(file.type || '').toLowerCase().startsWith('image/')) {
    throw new Error('Поддерживаются только изображения.');
  }
  if (!token) {
    throw new Error('Для загрузки изображения нужен вход в аккаунт.');
  }

  const backendBaseUrl = resolveBackendBaseUrl(graphqlEndpoint);
  const response = await fetch(`${backendBaseUrl}/works/upload-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({
      kind: 'image',
      fileName: file.name,
      mimeType: file.type || '',
      contentBase64: await fileToBase64(file),
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
    throw new Error(payload?.error || rawText || 'Не удалось загрузить изображение произведения.');
  }
  if (!payload?.url) {
    throw new Error('Сервер не вернул адрес изображения.');
  }
  return payload.url;
}
