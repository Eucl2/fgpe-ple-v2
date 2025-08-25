import { Spinner } from "@chakra-ui/react";
import styled from "@emotion/styled";
import { useKeycloak } from "../auth/keycloak-compat";
import React from "react";
import { useTranslation } from "react-i18next";
import { Route, RouteProps } from "react-router-dom";
import { rolesTypes } from "./types";

interface PrivateRouteI extends RouteProps {
  component: React.ComponentType<any>;
  roles: rolesTypes;
  redirectTo?: string;
}

export default function PrivateRoute({
  component: Component,
  roles,
  redirectTo,
  ...rest
}: PrivateRouteI) {
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();

  const redirectToLogin = () => {
    // create redirect uri to return to after login. Redirect user to the uri that person wanted to access or /profile
    const redirectUri = window.location.pathname
      ? `${window.location.origin}${window.location.pathname}`
      : `${window.location.origin}${process.env.PUBLIC_URL}/profile`;

    keycloak.login({
      redirectUri,
    });
  };

  const isAuthorized = (roles: rolesTypes) => {
    if (keycloak && roles) {
      const authResult = roles.some((r) => {
        const realm = keycloak.hasRealmRole(r);
        const resource = keycloak.hasResourceRole(r);
        return realm || resource;
      });

      if (!authResult) {
        redirectToLogin();
      }

      return authResult;
    }

    redirectToLogin();

    return false;
  };

  return (
    <Route
      {...rest}
      render={(props) => {
        return isAuthorized(roles) ? (
          <Component {...props} />
        ) : (
          <Fullscreen>
            <Spinner size="sm" marginRight={4} /> {t("Loading")}
          </Fullscreen>
        );
      }}
    />
  );
}

const Fullscreen = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 70px);
  width: 100%;
  pointer-events: none;
`;
