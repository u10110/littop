import { computed, reactive } from 'vue';

import { apolloClient } from './apollo.js';
import {
  clearStoredToken,
  extractGraphqlErrorMessage,
  getStoredToken,
  setStoredToken,
} from './auth.js';
import {
  LOGIN_MUTATION,
  ME_QUERY,
  REGISTER_MUTATION,
  REQUEST_PASSWORD_RESET_MUTATION,
  RESET_PASSWORD_MUTATION,
  UPDATE_MY_PROFILE_MUTATION,
} from './graphql.js';

const state = reactive({
  token: getStoredToken(),
  currentUser: null,
  bootstrapped: false,
  authBusy: false,
  authError: '',
  profileBusy: false,
  profileError: '',
  bootstrapError: '',
});

let bootstrapPromise = null;

async function fetchCurrentUser() {
  if (!state.token) {
    state.currentUser = null;
    state.bootstrapped = true;
    return null;
  }

  const { data } = await apolloClient.query({
    query: ME_QUERY,
    fetchPolicy: 'network-only',
  });

  state.currentUser = data?.me ?? null;
  state.bootstrapped = true;
  return state.currentUser;
}

export async function bootstrapSession() {
  if (state.bootstrapped) return state.currentUser;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      state.bootstrapError = '';
      return await fetchCurrentUser();
    } catch (error) {
      state.bootstrapError = extractGraphqlErrorMessage(error, 'Не удалось загрузить профиль.');
      clearStoredToken();
      state.token = '';
      state.currentUser = null;
      state.bootstrapped = true;
      return null;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

async function finishAuth(token) {
  state.token = setStoredToken(token);
  await apolloClient.resetStore();
  await fetchCurrentUser();
}

export function useSession() {
  async function login(input) {
    state.authBusy = true;
    state.authError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { input },
      });
      await finishAuth(data?.login?.token ?? '');
      return data?.login?.user ?? null;
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось войти.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function register(input) {
    state.authBusy = true;
    state.authError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: REGISTER_MUTATION,
        variables: { input },
      });
      await finishAuth(data?.register?.token ?? '');
      return data?.register?.user ?? null;
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось зарегистрироваться.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function requestPasswordReset(email) {
    state.authBusy = true;
    state.authError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: REQUEST_PASSWORD_RESET_MUTATION,
        variables: { email },
      });
      return Boolean(data?.requestPasswordReset);
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось отправить письмо для восстановления пароля.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function resetPassword({ token, password }) {
    state.authBusy = true;
    state.authError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: { token, password },
      });
      await finishAuth(data?.resetPassword?.token ?? '');
      return data?.resetPassword?.user ?? null;
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось сохранить новый пароль.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function saveProfile(input) {
    state.profileBusy = true;
    state.profileError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_MY_PROFILE_MUTATION,
        variables: { input },
      });
      state.currentUser = data?.updateMyProfile ?? state.currentUser;
      return state.currentUser;
    } catch (error) {
      state.profileError = extractGraphqlErrorMessage(error, 'Не удалось сохранить профиль.');
      throw error;
    } finally {
      state.profileBusy = false;
    }
  }

  async function completeExternalAuthToken(token) {
    state.authBusy = true;
    state.authError = '';
    try {
      await finishAuth(token);
      return state.currentUser;
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось завершить вход через соцсеть.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function logout() {
    clearStoredToken();
    state.token = '';
    state.currentUser = null;
    state.authError = '';
    state.profileError = '';
    state.bootstrapError = '';
    state.bootstrapped = true;
    await apolloClient.clearStore();
    await apolloClient.reFetchObservableQueries();
  }

  return {
    state,
    currentUser: computed(() => state.currentUser),
    isAuthenticated: computed(() => Boolean(state.currentUser && state.token)),
    authBusy: computed(() => state.authBusy),
    authError: computed(() => state.authError),
    profileBusy: computed(() => state.profileBusy),
    profileError: computed(() => state.profileError),
    bootstrapError: computed(() => state.bootstrapError),
    bootstrapped: computed(() => state.bootstrapped),
    login,
    register,
    requestPasswordReset,
    resetPassword,
    saveProfile,
    completeExternalAuthToken,
    logout,
    bootstrapSession,
  };
}
