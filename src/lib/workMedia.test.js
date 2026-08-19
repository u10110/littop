import test from 'node:test';
import assert from 'node:assert/strict';

import { uploadWorkImage } from './workMedia.js';

test('uploadWorkImage uses the shared work-media endpoint and returns its public URL', async () => {
  const originalFile = globalThis.File;
  const originalFetch = globalThis.fetch;
  globalThis.File = class FileMock { constructor(name = 'illustration.png', type = 'image/png') { this.name = name; this.type = type; } };
  const file = new File('illustration.png', 'image/png');
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, async text() { return JSON.stringify({ url: 'https://pre-prod.littop.ru/media/works/work-image.png' }); } };
  };
  try {
    const url = await uploadWorkImage({ file, graphqlEndpoint: 'https://pre-prod.littop.ru/api', token: 'token', fileToBase64: async () => 'aW1hZ2U=' });
    assert.equal(url, 'https://pre-prod.littop.ru/media/works/work-image.png');
    assert.equal(requests[0].url, 'https://pre-prod.littop.ru/api/works/upload-file');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(requests[0].options.body), { kind: 'image', fileName: 'illustration.png', mimeType: 'image/png', contentBase64: 'aW1hZ2U=' });
  } finally { globalThis.File = originalFile; globalThis.fetch = originalFetch; }
});
