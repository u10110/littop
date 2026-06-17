import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client/core';

import { buildAuthHeaders, getGraphqlEndpoint, getStoredToken } from './auth.js';

export function createApolloClient() {
  const httpLink = new HttpLink({
    uri: getGraphqlEndpoint(),
  });

  const authLink = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        ...buildAuthHeaders(getStoredToken()),
      },
    }));

    return forward(operation);
  });

  return new ApolloClient({
    link: ApolloLink.from([authLink, httpLink]),
    cache: new InMemoryCache(),
    connectToDevTools: true,
  });
}

export const apolloClient = createApolloClient();
