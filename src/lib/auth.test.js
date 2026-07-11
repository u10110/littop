import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOKEN_STORAGE_KEY,
  SOCIAL_AUTH_CALLBACK_PATH,
  buildAuthHeaders,
  buildPasswordResetUrl,
  buildSocialAuthCallbackUrl,
  buildSocialAuthStartUrl,
  clearStoredToken,
  getStoredToken,
  isValidEmail,
  parseAuthModalParams,
  parseSocialAuthCallbackParams,
  resolveBackendBaseUrl,
  resolveGraphqlEndpoint,
  setStoredToken,
  validatePassword,
} from './auth.js';

function createStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    dump() {
      return new Map(map);
    },
  };
}

test('resolveGraphqlEndpoint falls back to localhost endpoint and trims provided value', () => {
  assert.equal(resolveGraphqlEndpoint(), 'http://localhost:4000/');
  assert.equal(resolveGraphqlEndpoint('  https://api.example.com/graphql  '), 'https://api.example.com/graphql');
});

test('resolveBackendBaseUrl derives backend root from graphql endpoint', () => {
  assert.equal(resolveBackendBaseUrl('https://api.example.com/graphql'), 'https://api.example.com');
  assert.equal(resolveBackendBaseUrl('https://api.example.com/backend/graphql'), 'https://api.example.com/backend');
  assert.equal(resolveBackendBaseUrl('https://api.example.com/'), 'https://api.example.com');
});

test('social auth helpers build deterministic callback and start URLs', () => {
  const callback = buildSocialAuthCallbackUrl({
    currentOrigin: 'https://frontend.example.com',
    redirectTo: '/personal',
    provider: 'vk',
    mode: 'register',
  });
  assert.equal(
    callback,
    `https://frontend.example.com${SOCIAL_AUTH_CALLBACK_PATH}?provider=vk&mode=register&redirect=%2Fpersonal`,
  );

  const start = buildSocialAuthStartUrl('ok', {
    mode: 'login',
    graphqlEndpoint: 'https://api.example.com/graphql',
    currentOrigin: 'https://frontend.example.com',
    redirectTo: '/personal',
  });
  assert.equal(
    start,
    'https://api.example.com/auth/social/ok/start?mode=login&redirect_uri=https%3A%2F%2Ffrontend.example.com%2Fauth%2Fcallback%3Fprovider%3Dok%26mode%3Dlogin%26redirect%3D%252Fpersonal',
  );
});

test('parseSocialAuthCallbackParams extracts token, provider and redirect target', () => {
  assert.deepEqual(
    parseSocialAuthCallbackParams('?token=abc123&provider=vk&mode=register&redirect=%2Fpersonal'),
    {
      token: 'abc123',
      error: '',
      provider: 'vk',
      mode: 'register',
      redirectTo: '/personal',
    },
  );
});

test('password reset helpers build URL and parse modal state', () => {
  const resetUrl = buildPasswordResetUrl({
    currentOrigin: 'https://frontend.example.com',
    token: 'reset-token-123',
  });
  assert.equal(resetUrl, 'https://frontend.example.com/?auth=reset&token=reset-token-123');

  assert.deepEqual(
    parseAuthModalParams('?auth=reset&token=reset-token-123'),
    {
      mode: 'reset',
      token: 'reset-token-123',
    },
  );
});

test('email and password validators reject malformed values', () => {
  assert.equal(isValidEmail('reader@example.com'), true);
  assert.equal(isValidEmail('reader@'), false);
  assert.equal(validatePassword('1234567'), 'Пароль должен содержать минимум 8 символов.');
  assert.equal(validatePassword('12345678'), '');
});

test('token helpers persist and clear auth token in provided storage', () => {
  const storage = createStorage();

  assert.equal(getStoredToken(storage), '');

  setStoredToken('token-123', storage);
  assert.equal(getStoredToken(storage), 'token-123');
  assert.equal(storage.dump().get(TOKEN_STORAGE_KEY), 'token-123');

  clearStoredToken(storage);
  assert.equal(getStoredToken(storage), '');
  assert.equal(storage.dump().has(TOKEN_STORAGE_KEY), false);
});

test('buildAuthHeaders only emits Authorization header when token exists', () => {
  assert.deepEqual(buildAuthHeaders(''), {});
  assert.deepEqual(buildAuthHeaders(null), {});
  assert.deepEqual(buildAuthHeaders('abc'), {
    Authorization: 'Bearer abc',
  });
});
