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
import { ReactKeycloakProvider } from "@react-keycloak/web";
import App from "./App";
import MainLoading from "./components/MainLoading";
import "./i18n/config";
import keycloak from "./keycloak";
import theme from "./styles/theme/themes";
import ClearLocalStorage from "./utilities/ClearLocalStorage";
import { persistCache, LocalStorageWrapper } from "apollo3-cache-persist";
import * as serviceWorkerRegistration from "./service-worker-registration";
import { restoreTokens, storeTokens } from "./utilities/Storage";
import { useTranslation } from "react-i18next";

ClearLocalStorage();

const wsLink = new WebSocketLink({
  uri: process.env.REACT_APP_GRAPHQL_WS,
  options: {
    reconnect: true,
    lazy: true,
    connectionParams: () => {
      const token = keycloak.token;
      if (keycloak.isTokenExpired()) {
        keycloak
          .updateToken(1)
          .then(function (refreshed: boolean) {
            if (refreshed) {
              console.log("Token was successfully refreshed");
            } else {
              console.log("Token is still valid");
            }
            return {
              headers: {
                authorization: token ? `bearer ${token}` : "",
              },
            };
          })
          .catch(function () {
            console.log(
              "Failed to refresh the token, or the session has expired"
            );
          });
      } else {
        return {
          headers: {
            authorization: token ? `bearer ${token}` : "",
          },
        };
      }

      // return {
      //   headers: {
      //     authorization: `bearer ${keycloak.token}`,
      //   },
      // };
    },
  },
});

const httpLink = createUploadLink({
  uri: process.env.REACT_APP_GRAPHQL_URI,
});

const authLink = setContext((_, { headers }) => {
  const token = keycloak.token;
  if (keycloak.isTokenExpired()) {
    return keycloak
      .updateToken(1)
      .then(function (refreshed: boolean) {
        if (refreshed) {
          console.log("Token was successfully refreshed");
        } else {
          console.log("Token is still valid");
        }
        return {
          headers: {
            ...headers,
            Authorization: token ? `bearer ${token}` : "",
          },
        };
      })
      .catch(function () {
        console.log("Failed to refresh the token, or the session has expired");
        return {
          headers: {
            ...headers,
            Authorization: "",
          },
        };
      });
  } else {
    return {
      headers: {
        ...headers,
        Authorization: token ? `bearer ${token}` : "",
      },
    };
  }
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

  keycloak.onTokenExpired = () => {
    console.log("expired " + new Date());
    keycloak
      .updateToken(50)
      .then((refreshed: boolean) => {
        if (refreshed) {
          console.log("refreshed " + new Date());
        } else {
          console.log("not refreshed " + new Date());
        }
      })
      .catch(() => {
        console.error("Failed to refresh token " + new Date());
      });
  };

  const tokens = restoreTokens();

  ReactDOM.render(
    <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
      <ColorModeScript initialColorMode={theme.config.lightTheme} />
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{
          onLoad: "check-sso",
          checkLoginIframe: false,
          enableLogging: true,
          token: tokens.token,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
        }}
        LoadingComponent={<MainLoading />}
        onTokens={(tokens) =>
          storeTokens(tokens.token, tokens.idToken, tokens.refreshToken)
        }
      >
        <ApolloProvider client={client}>
          <Main />
        </ApolloProvider>
      </ReactKeycloakProvider>
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
