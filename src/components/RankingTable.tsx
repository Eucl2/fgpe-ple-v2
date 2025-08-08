import { gql, useQuery } from "@apollo/client";
import { Box } from "@chakra-ui/react";
import { useKeycloak } from "@react-keycloak/web";
import React from "react";
import { useTranslation } from "react-i18next";
import { getGroupRankingsQuery } from "../generated/getGroupRankingsQuery";
import { getLeaderboardsQuery } from "../generated/getLeaderboardsQuery";
import Error from "./Error";
import ColumnFilter from "./TableComponent/ColumnFilter";
import TableComponent from "./TableComponent/TableNoSorting";
import { TFunction } from "i18next";


const GET_LEADERBOARDS = gql`
  query getLeaderboardsQuery($gameId: String!) {
    leaderboards(gameId: $gameId) {
      id
      game {
        id
        name
      }
      parentChallenge {
        id
      }
      name
    }
  }
`;

const GET_GROUP_RANKINGS = gql`
  query getGroupRankingsQuery($gameId: String!, $leaderboardId: String!) {
    groupRankings(gameId: $gameId, leaderboardId: $leaderboardId) {
      player {
        id
        group {
          id
          name
        }
        user {
          id
          username
        }
      }
      score
    }
  }
`;

const RankingTable = ({ gameId }: { gameId: string }) => {
  const { t } = useTranslation();

  const {
    loading: loadingLeaderboards,
    error: errorLeaderboards,
    data: dataLeaderboards,
  } = useQuery<getLeaderboardsQuery>(GET_LEADERBOARDS, {
    fetchPolicy: "network-only",
    variables: { gameId },
  });

  if (loadingLeaderboards) {
    return <div>{t("Loading")}</div>;
  }

  if (errorLeaderboards) {
    return <Error errorContent={errorLeaderboards} />;
  }

  if (!dataLeaderboards && !loadingLeaderboards) {
    return <Error />;
  }

  return (
    <>
      {dataLeaderboards?.leaderboards.map((leaderboard, i) => {
        if (leaderboard.id) {
          return (
            <Ranking key={i} leaderboardId={leaderboard.id} gameId={gameId} />
          );
        }
      })}
    </>
  );
};

const getMetrics = (
  groupRankings: any,
  tFunction: TFunction
) => {
  let metricsArray: any = [];
  if (groupRankings.length < 1) {
    return metricsArray;
  }

  const score = groupRankings[0].score;
  const keys = Object.keys(score);

  for (let i = 0; i < keys.length; i++) {
    metricsArray.push({
      Header: `${tFunction("table.metric")} [${tFunction(keys[i], { defaultValue: keys[i] })}]`,
      accessor: `score.${keys[i]}`,
      Cell: ({ value }: { value: any }) => {
        if (typeof value !== "undefined") {
          if (typeof value === "object") {
            let sum = 0;
            Object.keys(value).forEach((key) => {
              sum += value[key];
            });

            return <span key={i}>{sum}</span>;
          }
          return <span key={i}>{JSON.stringify(value)}</span>;
        } else {
          return <span key={i}>{tFunction("NA")}</span>;
        }
      },
    });
  }

  return metricsArray;
};

const Ranking = ({
  gameId,
  leaderboardId,
}: {
  gameId: string;
  leaderboardId: string;
}) => {
  const { t } = useTranslation();
  const { keycloak } = useKeycloak();

  const {
    loading: loadingGroupRankings,
    error: errorGroupRankings,
    data: dataGroupRankings,
  } = useQuery<getGroupRankingsQuery>(GET_GROUP_RANKINGS, {
    fetchPolicy: "network-only",
    variables: { gameId, leaderboardId },
  });

  if (loadingGroupRankings) {
    return <div>{t("Loading")}</div>;
  }

  if (errorGroupRankings) {
    console.log("ERROR", errorGroupRankings);
    return <Error errorContent={errorGroupRankings} />;
  }

  if (!dataGroupRankings && !loadingGroupRankings) {
    return <Error />;
  }

  if (!dataGroupRankings) {
    return <Error />;
  }

  const metrics = getMetrics(dataGroupRankings.groupRankings, t);

  return (
    <Box>
      <TableComponent
        dontRecomputeChange
        columns={[
          {
            Header: t("Rank"),
            accessor: "",
            Cell: (row: { row: { id: string } }) => {
              return <div>{Number(row.row.id) + 1}</div>;
            },
            disableSortBy: true,
            disableFilters: true,
          },
          {
            Header: t("table.username"),
            accessor: "player.user.username",
            Cell: ({ value }: { value: any }) =>
              keycloak.profile?.username == value ? (
                <Box color="deepskyblue">{value}</Box>
              ) : (
                <Box>{value}</Box>
              ),
            Filter: ({ column }: { column: any }) => (
              <ColumnFilter
                column={column}
                placeholder={t("placeholders.username")}
              />
            ),
          },

          ...metrics,
        ]}
        data={dataGroupRankings.groupRankings}
      />
    </Box>
  );
};

export default RankingTable;
