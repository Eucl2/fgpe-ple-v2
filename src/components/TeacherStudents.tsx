import { Alert, AlertIcon, Box, Heading } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { getInstructorGames } from "../generated/getInstructorGames";
import TableComponent from "./TableComponent";
import ColumnFilter from "./TableComponent/ColumnFilter";

const getPlayers = (data: getInstructorGames | undefined) => {
  if (!data) {
    return [];
  }

  const players = data.myGames.flatMap((game) => {
    return game.players.flatMap((player) => {
      // const totalExercises = player.learningPath.flatMap((learningPath) =>
      //   learningPath.refs.flatMap((ref) => ref)
      // );

      // const progress = {
      //   total: totalExercises.length,
      //   progress: totalExercises.filter((item) => item.solved).length,
      // };

      const totalChallengesCount = player.learningPath.length || 1;

      const progressCombined =
        player.learningPath
          .flatMap((learningPath) => learningPath.progress)
          .reduce((a, b) => a + b, 0) / totalChallengesCount;

      return { ...player, progress: progressCombined, game };
    });
  });

  return players;
};

const TeacherStudents = ({
  gamesData,
}: {
  gamesData: getInstructorGames | undefined;
}) => {
  const history = useHistory();

  const players = getPlayers(gamesData);
  const { t } = useTranslation();

  return (
    <>
      <Box>
        <Heading as="h3" size="md" marginTop={5} marginBottom={5}>
          {t("All your students")}
        </Heading>

        {players.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t("You have no students yet")}
          </Alert>
        )}

        <Box>
          <TableComponent
            onRowClick={(row: typeof players[number]) => {
              history.push({
                pathname: `/teacher/student-details/${row.user.id}`,
              });
            }}
            columns={[
              {
                Header: t("table.name"),
                accessor: "user.firstName",
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter
                    column={column}
                    placeholder={t("placeholders.name")}
                  />
                ),
              },
              {
                Header: t("table.lastName"),
                accessor: "user.lastName",
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter
                    column={column}
                    placeholder={t("placeholders.lastName")}
                  />
                ),
              },
              {
                Header: t("table.game"),
                accessor: "game.name",
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter
                    column={column}
                    placeholder={t("placeholders.game")}
                  />
                ),
              },
              {
                Header: t("table.submissions"),
                accessor: "stats.nrOfSubmissions",
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter column={column} placeholder="123" />
                ),
              },
              {
                Header: t("table.validations"),
                accessor: "stats.nrOfValidations",
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter column={column} placeholder="123" />
                ),
              },
              {
                Header: t("table.group"),
                accessor: "group.name",
                Cell: ({ value }: { value: any }) => {
                  return value ? value : "-";
                },
                Filter: ({ column }: { column: any }) => (
                  <ColumnFilter
                    column={column}
                    placeholder={t("placeholders.group")}
                  />
                ),
              },
              {
                Header: t("table.progress"),
                accessor: "progress",
                Cell: ({ value }: { value: any }) => {
                  return (value * 100).toFixed(1) + "%";
                },
                disableFilters: true,
                sortType: useMemo(
                  () => (rowA: any, rowB: any) => {
                    const a = rowA.original.progress;
                    const b = rowB.original.progress;

                    if (a > b) return 1;

                    if (b > a) return -1;

                    return 0;
                  },
                  []
                ),
              },
            ]}
            data={players}
          />
        </Box>
      </Box>
    </>
  );
};

export default TeacherStudents;
