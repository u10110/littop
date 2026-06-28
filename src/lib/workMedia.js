import {
  buildAuthHeaders,
  getGraphqlEndpoint,
  getStoredToken,
  resolveBackendBaseUrl,
} from './auth.js';

export const WORK_MEDIA_ENDPOINT = '/api/works/upload-file';

const WORK_MEDIA_META = {
  pdf: {
    accept: 'application/pdf,.pdf',
    emptyError: 'Выбери PDF-файл.',
    invalidError: 'Поддерживаются только PDF-файлы.',
  },
  audio: {
    accept: 'audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac',
    emptyError: 'Выбери аудиофайл.',
    invalidError: 'Поддерживаются аудиофайлы mp3, wav, ogg, webm, m4a, aac и flac.',
  },
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.replace(/^data:[^;]+;base64,/i, '');
}

export function getWorkMediaMeta(kind) {
  const normalized = String(kind || '').trim().toLowerCase();
  const meta = WORK_MEDIA_META[normalized];
  if (!meta) {
    throw new Error('Неизвестный тип файла произведения.');
  }
  return { kind: normalized, ...meta };
}

export function isAcceptedWorkMediaFile(kind, file) {
  const normalizedKind = getWorkMediaMeta(kind).kind;
  const mimeType = String(file?.type || '').trim().toLowerCase();
  const fileName = String(file?.name || '').trim().toLowerCase();

  if (normalizedKind === 'pdf') {
    return mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  }

  return mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i.test(fileName);
}

export async function uploadWorkMedia({
  kind,
  file,
  graphqlEndpoint = getGraphqlEndpoint(),
  token = getStoredToken(),
} = {}) {
  const meta = getWorkMediaMeta(kind);
  if (!(file instanceof File)) {
    throw new Error(meta.emptyError);
  }
  if (!isAcceptedWorkMediaFile(meta.kind, file)) {
    throw new Error(meta.invalidError);
  }
  if (!token) {
    throw new Error('Для загрузки файлов нужен вход в аккаунт.');
  }

  const backendBaseUrl = resolveBackendBaseUrl(graphqlEndpoint);
  const response = await fetch(`${backendBaseUrl}${WORK_MEDIA_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({
      kind: meta.kind,
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
    throw new Error(payload?.error || rawText || 'Не удалось загрузить файл произведения.');
  }

  return {
    kind: meta.kind,
    url: payload?.url || '',
    fileName: payload?.fileName || file.name,
    storedFileName: payload?.storedFileName || '',
  };
}
