import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WORK_MEDIA_ENDPOINT,
  getWorkMediaMeta,
  isAcceptedWorkMediaFile,
  uploadWorkMedia,
} from './workMedia.js';

test('getWorkMediaMeta returns config for pdf and audio', () => {
  assert.deepEqual(getWorkMediaMeta('pdf'), {
    kind: 'pdf',
    accept: 'application/pdf,.pdf',
    emptyError: 'Выбери PDF-файл.',
    invalidError: 'Поддерживаются только PDF-файлы.',
  });

  assert.equal(getWorkMediaMeta('audio').kind, 'audio');
  assert.throws(() => getWorkMediaMeta('video'), /Неизвестный тип файла произведения/);
});

test('isAcceptedWorkMediaFile validates pdf and audio by mime type or extension', () => {
  assert.equal(isAcceptedWorkMediaFile('pdf', { name: 'brief.pdf', type: 'application/pdf' }), true);
  assert.equal(isAcceptedWorkMediaFile('pdf', { name: 'brief.PDF', type: '' }), true);
  assert.equal(isAcceptedWorkMediaFile('pdf', { name: 'brief.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), false);

  assert.equal(isAcceptedWorkMediaFile('audio', { name: 'voice.mp3', type: 'audio/mpeg' }), true);
  assert.equal(isAcceptedWorkMediaFile('audio', { name: 'voice.FLAC', type: '' }), true);
  assert.equal(isAcceptedWorkMediaFile('audio', { name: 'voice.txt', type: 'text/plain' }), false);
});

test('uploadWorkMedia rejects missing auth token before network call', async () => {
  const file = new File(['pdf'], 'brief.pdf', { type: 'application/pdf' });

  await assert.rejects(
    uploadWorkMedia({ kind: 'pdf', file, token: '', graphqlEndpoint: 'https://backend.example.com/graphql' }),
    /Для загрузки файлов нужен вход в аккаунт/,
  );
});

test('uploadWorkMedia posts to backend endpoint and returns uploaded file metadata', async () => {
  const file = new File(['hello-audio'], 'demo.mp3', { type: 'audio/mpeg' });

  class MockFileReader {
    readAsDataURL(inputFile) {
      this.result = `data:${inputFile.type};base64,ZGVtby1hdWRpbw==`;
      queueMicrotask(() => this.onload?.());
    }
  }

  const originalFileReader = globalThis.FileReader;
  const originalFetch = globalThis.fetch;
  let capturedRequest = null;
  globalThis.FileReader = MockFileReader;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return {
      ok: true,
      text: async () => JSON.stringify({
        url: 'https://backend.example.com/media/audio/demo.mp3',
        fileName: 'demo.mp3',
        storedFileName: 'stored-demo.mp3',
      }),
    };
  };

  try {
    const result = await uploadWorkMedia({
      kind: 'audio',
      file,
      token: 'token-123',
      graphqlEndpoint: 'https://backend.example.com/graphql',
    });

    assert.deepEqual(result, {
      kind: 'audio',
      url: 'https://backend.example.com/media/audio/demo.mp3',
      fileName: 'demo.mp3',
      storedFileName: 'stored-demo.mp3',
    });

    assert.equal(capturedRequest.url, `https://backend.example.com${WORK_MEDIA_ENDPOINT}`);
    assert.equal(capturedRequest.options.method, 'POST');
    assert.equal(capturedRequest.options.headers.Authorization, 'Bearer token-123');
  } finally {
    globalThis.FileReader = originalFileReader;
    globalThis.fetch = originalFetch;
  }
});
