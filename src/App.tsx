import styled from "@emotion/styled";
import { useKeycloak } from "./auth/keycloak-compat";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Switch, useHistory } from "react-router-dom";
import AccountSettings from "./components/AccountSettings";
import AddPlayersToGame from "./components/AddPlayersToGame";
import Challenge from "./components/Challenge";
import Homepage from "./components/HomePage";
import InstructorGame from "./components/InstructorGame";
import JoinGameByToken from "./components/JoinGameByToken";
import LtiCallback from "./components/LtiCallback";
import MainLoading from "./components/MainLoading";
import ManageGames from "./components/ManageGames";
import Navbar from "./components/Navbar";
import NotFound from "./components/NotFound";
import { NotificationsProvider } from "./components/Notifications";
import PlayerDetails from "./components/PlayerDetails";
import Profile from "./components/Profile";
// import MainLoading from "./components/MainLoading";
import ProfileInGame from "./components/ProfileInGame";
import ToS from "./components/ToS";
import TutorialGame from "./components/tutorials/TutorialGame";
import TutorialPlayer from "./components/tutorials/TutorialPlayer";
import TutorialUserDetails from "./components/tutorials/TutorialUserDetails";
import UserDetails from "./components/UserDetails";
import { FocusActivityContextProvider } from "./context/FocusActivityContext";
import NavContext from "./context/NavContext";
import ZoomContext from "./context/ZoomContext";
import PrivateRoute from "./utilities/PrivateRoute";
import RegisterPlatformForm from "./components/RegisterPlatformForm";

const getZoomFactorFromLocalStorage = () => {
  const zoomFactor = localStorage.getItem("zoom");
  return zoomFactor ? Number(zoomFactor) : null;
};

const MainWrapper = styled.div`
  max-width: 1140px;
  padding: 15px;
  margin: auto;
`;

function App() {
  const history = useHistory();
  const [shouldBaseTutorialStart, setShouldBaseTutorialStart] = useState(false);
  const [toggledDarkMode, setToggledDarkMode] = useState(false);
  const { ready, t } = useTranslation();
  const [zoomFactor, setZoomFactor] = useState(
    getZoomFactorFromLocalStorage() || 1
  );
  const [activeGame, setActiveGame] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { initialized: keycloakInitialized } = useKeycloak();

  if (!ready || !keycloakInitialized) {
    return <MainLoading />;
  }

  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Route
        render={({ location }) => (
          <>
            <FocusActivityContextProvider>
              <ZoomContext.Provider
                value={{
                  zoomFactor,
                  setZoomFactor: (value: number) => {
                    setZoomFactor(value);
                  },
                }}
              >
                <NavContext.Provider
                  value={{
                    setActiveGame,
                    activeGame,
                    shouldBaseTutorialStart,
                    setShouldBaseTutorialStart,
                    toggledDarkMode,
                    setToggledDarkMode,
                  }}
                >
                  <ZoomWrapper zoomFactor={zoomFactor}>
                    <NotificationsProvider>
                      <Navbar />
                      <MainWrapper>
                        <AnimatePresence exitBeforeEnter initial={false}>
                          <Switch location={location} key={location.pathname}>
                            <Route
                              exact
                              path="/(|learning-platform)/"
                              component={Homepage}
                            />
                            <Route exact path="/tos" component={ToS} />
                            <Route
                              exact
                              path="/lti-callback"
                              component={LtiCallback}
                            />
                            <PrivateRoute
                              exact
                              path="/profile"
                              roles={["student", "teacher"]}
                              component={Profile}
                            />

                            <PrivateRoute
                              exact
                              path="/game/:gameId"
                              roles={["student"]}
                              component={ProfileInGame}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/game/:gameId"
                              roles={["teacher"]}
                              component={InstructorGame}
                            />

                            <PrivateRoute
                              exact
                              path="/game/:gameId/challenge/:challengeId/:exerciseId?"
                              roles={["student"]}
                              component={Challenge}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/game/:gameId/add-players"
                              roles={["teacher"]}
                              component={AddPlayersToGame}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/manage-games"
                              roles={["teacher"]}
                              component={ManageGames}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/student-details/:userId"
                              roles={["teacher"]}
                              component={UserDetails}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/player-details/:userId/:gameId"
                              roles={["teacher"]}
                              component={PlayerDetails}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/register-lti-platform"
                              roles={["teacher"]}
                              component={RegisterPlatformForm}
                            />

                            <PrivateRoute
                              exact
                              path="/profile/settings"
                              roles={["teacher", "student"]}
                              component={AccountSettings}
                            />

                            <PrivateRoute
                              exact
                              path="/game/enroll/:gameToken/:groupToken?"
                              roles={["student"]}
                              component={JoinGameByToken}
                            />

                            {/* TutorialRoutes */}
                            <PrivateRoute
                              exact
                              path="/teacher/tutorial/game/:tutorialGameId"
                              roles={["teacher"]}
                              component={TutorialGame}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/tutorial/player-details/:userId/:tutorialGameId"
                              roles={["teacher"]}
                              component={TutorialPlayer}
                            />

                            <PrivateRoute
                              exact
                              path="/teacher/tutorial/student-details/:userId"
                              roles={["teacher"]}
                              component={TutorialUserDetails}
                            />

                            <Route component={NotFound} />
                          </Switch>
                        </AnimatePresence>
                      </MainWrapper>
                    </NotificationsProvider>
                  </ZoomWrapper>
                </NavContext.Provider>
              </ZoomContext.Provider>
            </FocusActivityContextProvider>
            {/* </MainContext.Provider> */}
            {/* </NavContext.Provider> */}
          </>
        )}
      />
    </BrowserRouter>
  );
}

const ZoomWrapper = styled.div<{ zoomFactor: number }>`
  zoom: ${({ zoomFactor }) => zoomFactor};
`;

export default App;
