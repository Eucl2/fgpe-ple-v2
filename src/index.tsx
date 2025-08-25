// workaround to hide the React error overlay in development mode.
if (window.location.hostname === 'localhost') {
  const style = document.createElement('style');
  style.innerHTML = '#webpack-dev-server-client-overlay { display: none !important; }';
  document.head.appendChild(style);
}
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  split,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import './polyfills';
import { setContext } from "@apollo/client/link/context";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import {
  ChakraProvider,
  ColorModeScript,
  localStorageManager,
} from "@chakra-ui/react";
import { createUploadLink } from "apollo-upload-client";
import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import App from "./App";
import MainLoading from "./components/MainLoading";
import "./i18n/config";
// OIDC imports
import { AuthProvider } from "./auth/AuthContext";
import AuthCallback from "./auth/AuthCallback";
import SilentCallback from "./auth/SilentCallback";
import theme from "./styles/theme/themes";
import ClearLocalStorage from "./utilities/ClearLocalStorage";
import { persistCache, LocalStorageWrapper } from "apollo3-cache-persist";
import * as serviceWorkerRegistration from "./service-worker-registration";
import { useTranslation } from "react-i18next";

ClearLocalStorage();

// Helper function to get the OIDC token
const getOIDCToken = (): string => {
  const storageKey = `oidc.user:${process.env.REACT_APP_KEYCLOAK_URL}/realms/${process.env.REACT_APP_KEYCLOAK_REALM}:${process.env.REACT_APP_KEYCLOAK_CLIENT_ID}`;
  const storedUser = localStorage.getItem(storageKey);
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.access_token || '';
    } catch {
      return '';
    }
  }
  return '';
};

const wsLink = new WebSocketLink({
  uri: process.env.REACT_APP_GRAPHQL_WS,
  options: {
    reconnect: true,
    lazy: true,
    connectionParams: () => {
      const token = getOIDCToken();
      return {
        headers: {
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    },
  },
});

const httpLink = createUploadLink({
  uri: process.env.REACT_APP_GRAPHQL_URI,
});

const authLink = setContext((_, { headers }) => {
  const token = getOIDCToken();
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  authLink.concat(httpLink)
);
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  // Handle cancellation errors silently
  if (networkError && networkError.message === 'operation is manually canceled') {
    console.log('Apollo operation canceled - this is normal');
    return;
  }
  
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`)
    );
  }
  
  if (networkError) {
    console.error(`Network error: ${networkError}`);
  }
});

const cache = new InMemoryCache();

persistCache({
  cache,
  storage: new LocalStorageWrapper(window.localStorage),
}).then(() => {
  const client = new ApolloClient({
    link: from([errorLink, splitLink]),
    cache: cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });

  ReactDOM.render(
    <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
      <ColorModeScript initialColorMode={theme.config.lightTheme} />
      <AuthProvider loadingComponent={MainLoading}>
        <ApolloProvider client={client}>
          <Router>
            <Switch>
              <Route exact path="/auth/callback" component={AuthCallback} />
              <Route exact path="/auth/silent" component={SilentCallback} />
              <Route path="/" component={Main} />
            </Switch>
          </Router>
        </ApolloProvider>
      </AuthProvider>
    </ChakraProvider>,
    document.getElementById("root")
  );
});

const Main = () => {
  return (
    <Suspense fallback="...">
      <App />
    </Suspense>
  );
};

// Handle unhandled promise rejections globally
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && 
      event.reason.type === 'cancelation' && 
      event.reason.msg === 'operation is manually canceled') {
    console.log('Apollo operation canceled - this is normal');
    event.preventDefault();
    return;
  }
  
  console.error('Unhandled promise rejection:', event.reason);
});

serviceWorkerRegistration.register();