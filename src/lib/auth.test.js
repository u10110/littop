import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOKEN_STORAGE_KEY,
  buildAuthHeaders,
  clearStoredToken,
  getStoredToken,
  resolveGraphqlEndpoint,
  setStoredToken,
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
