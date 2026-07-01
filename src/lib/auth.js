export const TOKEN_STORAGE_KEY = 'littop.auth.token';
export const SOCIAL_AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_MODAL_QUERY_KEY = 'auth';
export const AUTH_MODAL_RESET_MODE = 'reset';
export const MIN_PASSWORD_LENGTH = 8;
export const SOCIAL_AUTH_PROVIDERS = {
  vk: {
    code: 'vk',
    label: 'ВКонтакте',
  },
  ok: {
    code: 'ok',
    label: 'Одноклассники',
  },
};

export function resolveGraphqlEndpoint(rawValue) {
  const normalized = typeof rawValue === 'string' ? rawValue.trim() : '';
  return normalized || 'http://localhost:4000/';
}

export function getGraphqlEndpoint() {
  return resolveGraphqlEndpoint(import.meta.env.VITE_GRAPHQL_ENDPOINT);
}

export function resolveBackendBaseUrl(graphqlEndpoint = getGraphqlEndpoint()) {
  const endpoint = resolveGraphqlEndpoint(graphqlEndpoint);

  try {
    const url = new URL(endpoint);
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    let basePath = normalizedPath;

    if (normalizedPath === '/graphql') {
      basePath = '';
    } else if (normalizedPath.endsWith('/graphql')) {
      basePath = normalizedPath.slice(0, -'/graphql'.length);
    }

    return `${url.origin}${basePath.replace(/\/+$/, '')}`;
  } catch {
    return endpoint.replace(/\/+$/, '');
  }
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export function validatePassword(value) {
  const password = String(value ?? '');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов.`;
  }
  return '';
}

export function buildSocialAuthCallbackUrl({
  currentOrigin = globalThis.location?.origin || 'http://localhost:5173',
  redirectTo = '/personal',
  provider = '',
  mode = 'login',
} = {}) {
  const url = new URL(SOCIAL_AUTH_CALLBACK_PATH, currentOrigin);

  if (provider) {
    url.searchParams.set('provider', provider);
  }

  if (mode) {
    url.searchParams.set('mode', mode);
  }

  if (redirectTo) {
    url.searchParams.set('redirect', redirectTo);
  }

  return url.toString();
}

export function buildPasswordResetUrl({
  currentOrigin = globalThis.location?.origin || 'http://localhost:5173',
  token = '',
} = {}) {
  const url = new URL('/', currentOrigin);
  url.searchParams.set(AUTH_MODAL_QUERY_KEY, AUTH_MODAL_RESET_MODE);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

export function buildSocialAuthStartUrl(
  provider,
  {
    mode = 'login',
    graphqlEndpoint = getGraphqlEndpoint(),
    currentOrigin = globalThis.location?.origin || 'http://localhost:5173',
    redirectTo = '/personal',
  } = {},
) {
  const backendBaseUrl = resolveBackendBaseUrl(graphqlEndpoint);
  const url = new URL(`${backendBaseUrl}/auth/social/${provider}/start`);
  url.searchParams.set('mode', mode);
  url.searchParams.set(
    'redirect_uri',
    buildSocialAuthCallbackUrl({ currentOrigin, redirectTo, provider, mode }),
  );
  return url.toString();
}

export function parseSocialAuthCallbackParams(searchParamsLike) {
  const params = searchParamsLike instanceof URLSearchParams
    ? searchParamsLike
    : new URLSearchParams(searchParamsLike || '');

  const pick = (...keys) => {
    for (const key of keys) {
      const value = params.get(key);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };

  return {
    token: pick('token', 'authToken', 'access_token'),
    error: pick('error', 'authError'),
    provider: pick('provider'),
    mode: pick('mode') || 'login',
    redirectTo: pick('redirect', 'next', 'returnTo') || '/personal',
  };
}

export function parseAuthModalParams(searchParamsLike) {
  const params = searchParamsLike instanceof URLSearchParams
    ? searchParamsLike
    : new URLSearchParams(searchParamsLike || '');

  const mode = params.get(AUTH_MODAL_QUERY_KEY);
  return {
    mode: typeof mode === 'string' ? mode.trim() : '',
    token: typeof params.get('token') === 'string' ? params.get('token').trim() : '',
  };
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


export function extractGraphqlErrorInfo(error) {
  const graphQLError = error?.graphQLErrors?.[0] || error?.networkError?.result?.errors?.[0] || null;
  return {
    code: graphQLError?.extensions?.code || '',
    reopenUntil: graphQLError?.extensions?.reopenUntil || '',
    login: graphQLError?.extensions?.login || '',
    message: graphQLError?.message || '',
  };
}
