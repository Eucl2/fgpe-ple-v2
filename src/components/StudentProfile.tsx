import { gql, useQuery } from "@apollo/client";
import { Heading } from "@chakra-ui/react";
import { useKeycloak } from "@react-keycloak/web";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayerGameProfiles } from "../generated/PlayerGameProfiles";
import { checkIfConnectionAborted } from "../utilities/ErrorMessages";
import withChangeAnimation from "../utilities/withChangeAnimation";
import Error from "./Error";
import GamesList from "./GamesList";
import Rewards from "./Rewards";

const PLAYER_GAME_PROFILES = gql`
  query PlayerGameProfiles {
    myGameProfiles {
      id
      game {
        id
        name
        description
        startDate
        endDate
        state
      }
      user {
        id
        username
        email
      }
      group {
        id
        name
      }
      learningPath {
        id
        progress
        refs {
          solved
        }
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
  }
`;

const StudentProfile: React.ComponentType = () => {
  const { t, i18n } = useTranslation();
  const { keycloak, initialized } = useKeycloak();
  const { data, error, loading } = useQuery<PlayerGameProfiles>(
    PLAYER_GAME_PROFILES,
    {
      fetchPolicy: "network-only",
    }
  );

  const [userProfile, setUserProfile] =
    useState<null | Keycloak.KeycloakProfile>(null);
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
      return <Error errorContent={JSON.stringify(error)} />;
    }
  }

  if (!data) {
    return <Error errorContent={"No data"} />;
  }

  return (
    <div>
      {/* Hello, {userProfile?.firstName} {userProfile?.lastName} */}
      <Heading as="h3" size="md" marginTop={5} marginBottom={5}>
        {t("Rewards")}
      </Heading>
      <Rewards data={data} />

      <Heading as="h3" size="md" marginTop={10}>
        {t("Games")}
      </Heading>

      <GamesList data={data} />
      {data.myGameProfiles.length < 1 && t("No games")}
    </div>
  );
};

export default withChangeAnimation(StudentProfile);
