import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeVideoEmbedUrl } from './videoEmbeds.js';

test('normalizes Rutube public and embed links into a Rutube embed URL', () => {
  assert.equal(
    normalizeVideoEmbedUrl('https://rutube.ru/video/0123456789abcdef0123456789abcdef/'),
    'https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef',
  );
  assert.equal(
    normalizeVideoEmbedUrl('https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef'),
    'https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef',
  );
});

test('accepts only VK Video embed links because public VK links lack the required embed hash', () => {
  assert.equal(
    normalizeVideoEmbedUrl('https://vk.com/video_ext.php?oid=-1&id=2&hash=abc123'),
    'https://vk.com/video_ext.php?oid=-1&id=2&hash=abc123',
  );
  assert.throws(() => normalizeVideoEmbedUrl('https://vkvideo.ru/video-1_2'), /вставки/i);
});

test('rejects arbitrary video providers and unsafe URLs', () => {
  assert.throws(() => normalizeVideoEmbedUrl('https://youtube.com/watch?v=x'), /VK Видео или Rutube/i);
  assert.throws(() => normalizeVideoEmbedUrl('javascript:alert(1)'), /VK Видео или Rutube/i);
});
