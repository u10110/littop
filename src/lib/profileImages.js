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

async function fileToBase64(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.replace(/^data:[^;]+;base64,/i, '');
}

export async function uploadProfileImage({
  kind,
  file,
  graphqlEndpoint = getGraphqlEndpoint(),
  token = getStoredToken(),
} = {}) {
  const normalizedKind = String(kind || '').trim().toLowerCase();
  if (normalizedKind !== 'avatar' && normalizedKind !== 'cover') {
    throw new Error('Тип изображения должен быть avatar или cover.');
  }
  if (!(file instanceof File)) {
    throw new Error('Выбери изображение.');
  }
  if (!token) {
    throw new Error('Для загрузки изображения нужен вход в аккаунт.');
  }

  const backendBaseUrl = resolveBackendBaseUrl(graphqlEndpoint);
  const response = await fetch(`${backendBaseUrl}/profile/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({
      kind: normalizedKind,
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
    throw new Error(payload?.error || rawText || 'Не удалось загрузить изображение.');
  }

  return payload?.imageUrl || '';
}
