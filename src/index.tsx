import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import {
  ChakraProvider,
  ColorModeScript,
  localStorageManager,
} from "@chakra-ui/react";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { createUploadLink } from "apollo-upload-client";
import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import MainLoading from "./components/MainLoading";
import "./i18n/config";
import keycloak from "./keycloak";
import theme from "./styles/theme/themes";
import ClearLocalStorage from "./utilities/ClearLocalStorage";
import { persistCache, LocalStorageWrapper } from "apollo3-cache-persist";

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
            ...headers,
            Authorization: token ? `bearer ${token}` : "",
          },
        };
      })
      .catch(function () {
        console.log("Failed to refresh the token, or the session has expired");
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

const cache = new InMemoryCache();

persistCache({
  cache,
  storage: new LocalStorageWrapper(window.localStorage),
}).then(() => {
  const client = new ApolloClient({
    link: splitLink,
    cache: cache,
  });

  keycloak.onTokenExpired = () => {
    console.log("expired " + new Date());
    keycloak
      .updateToken(50)
      .success((refreshed: boolean) => {
        if (refreshed) {
          console.log("refreshed " + new Date());
        } else {
          console.log("not refreshed " + new Date());
        }
      })
      .error(() => {
        console.error("Failed to refresh token " + new Date());
      });
  };

  ReactDOM.render(
    <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
      {/* <GlobalStyle /> */}

      <ColorModeScript initialColorMode={theme.config.lightTheme} />
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{
          onLoad: "check-sso",
        }}
        LoadingComponent={<MainLoading />}
      >
        <ApolloProvider client={client}>
          <Suspense fallback="loading">
            <App />
          </Suspense>
        </ApolloProvider>
      </ReactKeycloakProvider>
    </ChakraProvider>,
    document.getElementById("root")
  );
});
