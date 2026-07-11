import { computed, reactive } from 'vue';

import { apolloClient } from './apollo.js';
import {
  clearStoredOwnerToken,
  clearStoredToken,
  extractGraphqlErrorInfo,
  extractGraphqlErrorMessage,
  getStoredOwnerToken,
  getStoredToken,
  setStoredOwnerToken,
  setStoredToken,
} from './auth.js';
import {
  ADMIN_SWITCH_MANAGED_AUTHOR_MUTATION,
  LOGIN_MUTATION,
  ME_QUERY,
  REGISTER_MUTATION,
  REQUEST_PASSWORD_RESET_MUTATION,
  RESET_PASSWORD_MUTATION,
  REOPEN_CLOSED_ACCOUNT_MUTATION,
  UPDATE_MY_PROFILE_MUTATION,
  CLOSE_MY_ACCOUNT_MUTATION,
} from './graphql.js';

const state = reactive({
  token: getStoredToken(),
  ownerToken: getStoredOwnerToken(),
  currentUser: null,
  bootstrapped: false,
  authBusy: false,
  authError: '',
  authMeta: null,
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
      state.authMeta = null;
      await finishAuth(data?.login?.token ?? '');
      return data?.login?.user ?? null;
    } catch (error) {
      state.authMeta = extractGraphqlErrorInfo(error);
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось войти.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function register(input) {
    state.authBusy = true;
    state.authError = '';
    state.authMeta = null;
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
    state.authMeta = null;
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
    state.authMeta = null;
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

  async function reopenClosedAccount(input) {
    state.authBusy = true;
    state.authError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: REOPEN_CLOSED_ACCOUNT_MUTATION,
        variables: { input },
      });
      state.authMeta = null;
      await finishAuth(data?.reopenClosedAccount?.token ?? '');
      return data?.reopenClosedAccount?.user ?? null;
    } catch (error) {
      state.authMeta = extractGraphqlErrorInfo(error);
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось открыть аккаунт.');
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

  async function closeAccount() {
    state.profileBusy = true;
    state.profileError = '';
    try {
      const { data } = await apolloClient.mutate({
        mutation: CLOSE_MY_ACCOUNT_MUTATION,
      });
      await logout();
      return Boolean(data?.closeMyAccount);
    } catch (error) {
      state.profileError = extractGraphqlErrorMessage(error, 'Не удалось закрыть аккаунт.');
      throw error;
    } finally {
      state.profileBusy = false;
    }
  }

  async function completeExternalAuthToken(token) {
    state.authBusy = true;
    state.authError = '';
    state.authMeta = null;
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


  async function switchToManagedAuthor(managedUserId) {
    state.authBusy = true;
    state.authError = '';
    state.authMeta = null;
    try {
      if (state.currentUser?.role === 'admin' && state.token) {
        state.ownerToken = setStoredOwnerToken(state.token);
      }
      const { data } = await apolloClient.mutate({
        mutation: ADMIN_SWITCH_MANAGED_AUTHOR_MUTATION,
        variables: { managedUserId },
      });
      await finishAuth(data?.adminSwitchManagedAuthor?.token ?? '');
      return state.currentUser;
    } catch (error) {
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось переключить аккаунт.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function restoreOwnerSession() {
    const ownerToken = getStoredOwnerToken();
    if (!ownerToken) return null;
    state.authBusy = true;
    state.authError = '';
    state.authMeta = null;
    try {
      await finishAuth(ownerToken);
      clearStoredOwnerToken();
      state.ownerToken = '';
      return state.currentUser;
    } catch (error) {
      clearStoredOwnerToken();
      state.ownerToken = '';
      state.authError = extractGraphqlErrorMessage(error, 'Не удалось вернуться в аккаунт владельца.');
      throw error;
    } finally {
      state.authBusy = false;
    }
  }

  async function logout() {
    clearStoredOwnerToken();
    clearStoredToken();
    state.token = '';
    state.ownerToken = '';
    state.currentUser = null;
    state.authError = '';
    state.authMeta = null;
    state.profileError = '';
    state.bootstrapError = '';
    state.bootstrapped = true;
    await apolloClient.clearStore();
    await apolloClient.reFetchObservableQueries();
  }

  return {
    state,
    currentUser: computed(() => state.currentUser),
    hasStoredOwnerSession: computed(() => Boolean(state.ownerToken || getStoredOwnerToken())),
    isAuthenticated: computed(() => Boolean(state.currentUser && state.token)),
    authBusy: computed(() => state.authBusy),
    authError: computed(() => state.authError),
    authMeta: computed(() => state.authMeta),
    profileBusy: computed(() => state.profileBusy),
    profileError: computed(() => state.profileError),
    bootstrapError: computed(() => state.bootstrapError),
    bootstrapped: computed(() => state.bootstrapped),
    login,
    register,
    requestPasswordReset,
    resetPassword,
    reopenClosedAccount,
    saveProfile,
    closeAccount,
    completeExternalAuthToken,
    switchToManagedAuthor,
    restoreOwnerSession,
    logout,
    bootstrapSession,
  };
}
