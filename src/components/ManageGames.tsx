import { gql, useMutation, useQuery } from "@apollo/client";
import { Box, Button, Flex, Heading, useDisclosure } from "@chakra-ui/react";
import { useKeycloak } from "../auth/keycloak-compat";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { getAllAvailableGames } from "../generated/getAllAvailableGames";
import { UNASSIGN_INSTRUCTOR } from "../graphql/unassignInstructor";
import { checkIfConnectionAborted } from "../utilities/ErrorMessages";
import withChangeAnimation from "../utilities/withChangeAnimation";
import AddGameModal from "./AddGameModal";
import Error from "./Error";
import { useNotifications } from "./Notifications";
import { RemoveAssignmentAlert } from "./RemoveAssignmentAlert";
import TableComponent from "./TableComponent";
import ColumnFilter from "./TableComponent/ColumnFilter";

const GET_ALL_AVAILABLE_GAMES = gql`
  query getAllAvailableGames {
    games {
      id
      name
      description
      private
      instructors {
        email
        id
      }
    }
  }
`;

const ASSIGN_INSTRUCTOR = gql`
  mutation assignInstructorMutation($gameId: String!, $userId: String!) {
    assignInstructor(gameId: $gameId, userId: $userId) {
      id
    }
  }
`;

const REMOVE_GAME = gql`
  mutation removeGameMutation($gameId: String!) {
    removeGame(gameId: $gameId) {
      id
    }
  }
`;

const ManageGames = () => {
  const [gameRowCellToUnassign, setGameRowCellToUnassign] = React.useState<{
    row: any;
    cell: any;
    value: any;
  }>();

  const { add: addNotification } = useNotifications();
  const history = useHistory();

  const {
    data: availableGamesData,
    error,
    loading,
    refetch,
  } = useQuery<getAllAvailableGames>(GET_ALL_AVAILABLE_GAMES, {
    fetchPolicy: "no-cache",
  });
  const { t } = useTranslation();
  const { keycloak } = useKeycloak();

  const [
    assignInstructor,
    { data: assignInstructorData, loading: assignInstructorLoading },
  ] = useMutation(ASSIGN_INSTRUCTOR);

  const [unassignInstructor] = useMutation(UNASSIGN_INSTRUCTOR);

  const [removeGame, { data: removeGameData, loading: removeGameLoading }] =
    useMutation(REMOVE_GAME);

  const memoizedRowChecking = useCallback(
    (row: any) => {
      return (
        row.instructors.filter(
          (instructor: any) =>
            instructor.email == keycloak.profile?.email || false
        ).length > 0
      );
    },
    [availableGamesData]
  );

  const {
    isOpen: isAddGameModalOpen,
    onOpen: onAddGameModalOpen,
    onClose: onAddGameModalClose,
  } = useDisclosure();

  const { isOpen, onOpen, onClose } = useDisclosure();
  // const cancelRef = React.useRef<any>();

  if (!loading && error) {
    const isServerConnectionError = checkIfConnectionAborted(error);

    if (isServerConnectionError) {
      return <Error serverConnectionError />;
    } else {
      return <Error errorContent={error} />;
    }
  }

  if (loading) {
    return <div>{t("Loading")}</div>;
  }

  return (
    <Box>
      <RemoveAssignmentAlert
        onConfirm={async () => {
          if (!gameRowCellToUnassign) return;
          const { row, cell, value } = gameRowCellToUnassign;
          const gameId = row.original.id;
          cell.setState({ loading: true });

          if (!keycloak.userInfo) {
            await keycloak.loadUserInfo();
          }

          const userInfo = keycloak.userInfo as any;
          const userId = userInfo.sub;

          if (value) {
            await unassignInstructor({
              variables: {
                gameId,
                userId,
              },
            });
          } else {
            await assignInstructor({
              variables: {
                gameId,
                userId,
              },
            });
          }

          await refetch();
          cell.setState({ loading: false });
        }}
        isLoading={removeGameLoading}
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
      />
      <AddGameModal
        isOpen={isAddGameModalOpen}
        onOpen={onAddGameModalOpen}
        onClose={onAddGameModalClose}
        refetchGames={refetch}
      />
      <Flex justifyContent="space-between" alignItems="center">
        <Heading as="h3" size="md" marginTop={5} marginBottom={5}>
          {t("All available games")}
        </Heading>
        <Flex>
          <Link to="/profile">
            <Button variant="outline" marginRight={2}>
              {t("Back")}
            </Button>
          </Link>

          <Button onClick={onAddGameModalOpen}>{t("Add new game")}</Button>
        </Flex>
      </Flex>

      <Box>
        <TableComponent
          onRowClick={(row) => {
            const enrolled = memoizedRowChecking(row);
            if (enrolled) {
              history.push({
                pathname: `/teacher/game/${row.id}`,
              });
            } else {
              addNotification({
                status: "warning",
                title: t("error.teacherNotEnrolled.title"),
                description: t("error.teacherNotEnrolled.description"),
              });
            }
          }}
          columns={[
            {
              Header: t("table.gameName"),
              accessor: "name",
              Filter: ({ column }: { column: any }) => (
                <ColumnFilter
                  column={column}
                  placeholder={t("placeholders.gameName")}
                />
              ),
            },
            {
              Header: t("table.gameDescription"),
              accessor: "description",
              Filter: ({ column }: { column: any }) => (
                <ColumnFilter
                  column={column}
                  placeholder={t("placeholders.gameDescription")}
                />
              ),
            },
            {
              Header: t("table.assigned"),
              accessor: (row: any) => {
                const enrolled = memoizedRowChecking(row);
                return enrolled;
              },
              id: "button-1",
              Cell: ({
                value,
                cell,
                row,
              }: {
                value: boolean;
                cell: any;
                row: any;
              }) => (
                <Button
                  size="sm"
                  isLoading={cell.state.loading}
                  onClick={async () => {
                    setGameRowCellToUnassign({
                      row,
                      cell,
                      value,
                    });

                    const gameId = row.original.id;
                    cell.setState({ loading: true });

                    if (!keycloak.userInfo) {
                      await keycloak.loadUserInfo();
                    }

                    const userInfo = keycloak.userInfo as any;
                    const userId = userInfo.sub;

                    if (value) {
                      return onOpen();

                      // await unassignInstructor({
                      //   variables: {
                      //     gameId,
                      //     userId,
                      //   },
                      // });
                    } else {
                      await assignInstructor({
                        variables: {
                          gameId,
                          userId,
                        },
                      });
                    }

                    await refetch();
                    cell.setState({ loading: false });
                  }}
                >
                  {value ? t("Remove the assignment") : t("Assign me")}
                </Button>
              ),
              disableFilters: true,
            },
            {
              Header: t("table.removeGame"),
              // accessor: "id",
              id: "button-2",
              Cell: ({ cell, row }: { cell: any; row: any }) => (
                <Button
                  size="sm"
                  isLoading={cell.state.loading}
                  onClick={async () => {
                    const gameId = row.original.id;
                    cell.setState({ loading: true });

                    try {
                      await removeGame({
                        variables: {
                          gameId,
                        },
                      });

                      await refetch();
                    } catch (err) {
                      addNotification({
                        status: "error",
                        title: t("error.removeGame.title"),
                        description: t("error.removeGame.description"),
                      });
                      console.log("Error!");
                    }

                    cell.setState({ loading: false });
                  }}
                >
                  {t("table.removeGame")}
                </Button>
              ),
              Filter: ({ column }: { column: any }) => (
                <ColumnFilter
                  column={column}
                  placeholder={t("placeholders.gameDescription")}
                />
              ),
            },
          ]}
          data={availableGamesData?.games}
        />
      </Box>
    </Box>
  );
};

export default withChangeAnimation(ManageGames);
