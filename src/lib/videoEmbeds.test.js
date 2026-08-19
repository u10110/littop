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

test('accepts a full VK Video iframe code and extracts its verified embed URL', () => {
  const code = '<iframe src="https://vkvideo.ru/video_ext.php?oid=-211437014&id=456248398&hash=b0bca6ce6edf263a" width="640" height="360" frameborder="0" allowfullscreen="1" style="background-color: #000" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>';
  assert.equal(
    normalizeVideoEmbedUrl(code),
    'https://vkvideo.ru/video_ext.php?oid=-211437014&id=456248398&hash=b0bca6ce6edf263a',
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
