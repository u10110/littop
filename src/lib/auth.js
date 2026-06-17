export const TOKEN_STORAGE_KEY = 'littop.auth.token';

export function resolveGraphqlEndpoint(rawValue) {
  const normalized = typeof rawValue === 'string' ? rawValue.trim() : '';
  return normalized || 'http://localhost:4000/';
}

export function getGraphqlEndpoint() {
  return resolveGraphqlEndpoint(import.meta.env.VITE_GRAPHQL_ENDPOINT);
}

export function getStoredToken(storage = globalThis.localStorage) {
  try {
    return storage?.getItem?.(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredToken(token, storage = globalThis.localStorage) {
  const normalized = typeof token === 'string' ? token.trim() : '';
  try {
    if (normalized) {
      storage?.setItem?.(TOKEN_STORAGE_KEY, normalized);
    } else {
      storage?.removeItem?.(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and keep the app usable in restricted environments.
  }
  return normalized;
}

export function clearStoredToken(storage = globalThis.localStorage) {
  try {
    storage?.removeItem?.(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep the app usable in restricted environments.
  }
}

export function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function extractGraphqlErrorMessage(error, fallback = 'Не удалось выполнить запрос.') {
  const graphQLErrorMessage = error?.graphQLErrors?.find?.((item) => item?.message)?.message;
  if (graphQLErrorMessage) return graphQLErrorMessage;

  const networkGraphQLError = error?.networkError?.result?.errors?.find?.((item) => item?.message)?.message;
  if (networkGraphQLError) return networkGraphQLError;

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
