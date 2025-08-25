import { gql, useQuery } from "@apollo/client";
import { Heading } from "@chakra-ui/react";
import { useKeycloak } from "../auth/keycloak-compat";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayerGameProfiles } from "../generated/PlayerGameProfiles";
import { checkIfConnectionAborted } from "../utilities/ErrorMessages";
import withChangeAnimation from "../utilities/withChangeAnimation";
import Error from "./Error";
import GamesList from "./GamesList";
import PublicGames from "./PublicGames";
import Rewards from "./Rewards";

const PLAYER_GAME_PROFILES = gql`
  query PlayerGameProfiles {
    myGameProfiles {
      id
      game {
        archival
        id
        name
        description
        startDate
        endDate
        state
      }
      user {
        id
      }

      learningPath {
        id
        progress
      }
      rewards {
        id
        reward {
          id
          name
          description
          image
          kind
          cost
          createdAt
          game {
            name
          }
          parentChallenge {
            name
          }
        }
      }
    }

    games {
      id
      name
      description
      archival
    }
  }
`;

const StudentProfile: React.ComponentType = () => {
  const { t } = useTranslation();
  const { keycloak, initialized } = useKeycloak();
  const { data, error, loading, refetch } = useQuery<PlayerGameProfiles>(
    PLAYER_GAME_PROFILES,
    {
      fetchPolicy: "no-cache",
    }
  );

  const [, setUserProfile] = useState<null | Keycloak.KeycloakProfile>(null);
  //   console.log("userProfile", userProfile);
  const loadUserProfile = async () => {
    setUserProfile(await keycloak.loadUserProfile());
  };

  useEffect(() => {
    if (initialized) {
      loadUserProfile();
    }
  }, [initialized]);

  if (loading) {
    return <div>{t("Loading")}</div>;
  }

  if (!loading && error) {
    const isServerConnectionError = checkIfConnectionAborted(error);

    if (isServerConnectionError) {
      return <Error serverConnectionError />;
    } else {
      return <Error errorContent={error} />;
    }
  }

  if (!data) {
    return <Error />;
  }

  return (
    <div>
      {/* Hello, {userProfile?.firstName} {userProfile?.lastName} */}
      <Heading as="h3" size="md" marginTop={5} marginBottom={5}>
        {t("Rewards")}
      </Heading>
      <Rewards data={data} />

      <GamesList data={data} />
      {data.myGameProfiles.length < 1 && t("No games")}

      <Heading as="h3" size="md" marginTop={10}>
        {t("All available games")}
      </Heading>

      <PublicGames
        gamesData={data.games}
        gameProfiles={data.myGameProfiles}
        refetch={refetch}
      />
    </div>
  );
};

export default withChangeAnimation(StudentProfile);
