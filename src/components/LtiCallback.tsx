import { useKeycloak } from "../auth/keycloak-compat";
import axios from "axios";
import { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { FocusActivityContextType } from "../@types/focus-activity";
import { FocusActivityContext } from "../context/FocusActivityContext";

import useQueryParams from "../utilities/useQueryParams";
import withChangeAnimation from "../utilities/withChangeAnimation";
import MainLoading from "./MainLoading";

const LtiCallback = () => {
  const history = useHistory();
  const queryParams = useQueryParams();
  const { keycloak, initialized } = useKeycloak();
  const { activate } = useContext(FocusActivityContext) as FocusActivityContextType

  const { ltik, gameId, challengeId, exerciseId } = queryParams;

  useEffect(() => {
    const authenticate = async () => {
      const time = new Date().getTime();
      const res = await axios.post(
        process.env.REACT_APP_API_URI + "/lti/auth",
        {
          ltik,
          game: gameId,
          challenge: challengeId,
          activity: exerciseId,
        }
      );

      keycloak.token = res.data.accessToken;
      keycloak.refreshToken = res.data.refreshToken;
      keycloak.idToken = res.data.idToken;
      keycloak.timeSkew = 0; // Reset time skew

      if (keycloak.token) {
        try {
          const payload = JSON.parse(atob(keycloak.token.split('.')[1]));
          keycloak.tokenParsed = payload;
          keycloak.subject = payload.sub;
          keycloak.sessionId = payload.session_state;
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }

      if (gameId && challengeId && res.data.role?.toLowerCase() === 'student') {
        activate({ ltik, gameId, challengeId, activityId: exerciseId });
      } else {
        if (gameId && res.data.role?.toLowerCase() === 'student') {
          history.push(`/game/${gameId}`);
        } else {
          history.push('/profile');
        }
      }
    }
    if (initialized && ltik) {
      authenticate();
    }
  }, [activate, history, keycloak, initialized, ltik, gameId, challengeId, exerciseId]);

  return (<MainLoading />);
};

export default withChangeAnimation(LtiCallback);