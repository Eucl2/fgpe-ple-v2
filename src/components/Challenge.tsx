import { useQuery, useSubscription } from "@apollo/client";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Text,
  useColorMode,
} from "@chakra-ui/react";
import styled from "@emotion/styled";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import Countdown from "react-countdown";
import { useTranslation } from "react-i18next";
import { BiTimer } from "react-icons/bi";
import { Redirect, useParams } from "react-router-dom";
import { FocusActivityContextType } from "../@types/focus-activity";
import { FocusActivityContext } from "../context/FocusActivityContext";
import { challengeStatusUpdatedStudentSub } from "../generated/challengeStatusUpdatedStudentSub";
import {
  FindChallenge,
  FindChallenge_myChallengeStatus_refs,
} from "../generated/FindChallenge";
import { getActivityById } from "../generated/getActivityById";
import { Mode, RewardType, State } from "../generated/globalTypes";
import {
  rewardReceivedStudentSubscription,
  rewardReceivedStudentSubscription_rewardReceivedStudent_reward,
} from "../generated/rewardReceivedStudentSubscription";
import { CHALLENGE_STATUS_UPDATED_STUDENT_SUB } from "../graphql/challengeStatusUpdatedSub";
import { FIND_CHALLENGE } from "../graphql/findChallenge";
import { GET_ACTIVITY_BY_ID } from "../graphql/getActivityById";
import { REWARD_RECEIVED_STUDENT_SUB } from "../graphql/rewardReceivedStudentSub";
import { checkIfConnectionAborted } from "../utilities/ErrorMessages";
import withChangeAnimation from "../utilities/withChangeAnimation";
import BreadcrumbComponent from "./BreadcrumbComponent";
import Error from "./Error";
import Exercise from "./Exercise";
import { get_exercise_data, ExerciseData } from "./Exercise/ExerciseData";
import MainLoading from "./MainLoading";
import { useNotifications } from "./Notifications";
import ScrollbarWrapper from "./ScrollbarWrapper";

interface ParamTypes {
  gameId: string;
  challengeId: string;
  exerciseId?: string;
}

const Challenge = () => {
  const [showExerciseNumbers, setShowExerciseNumbers] = useState(false);
  const { gameId, challengeId, exerciseId } = useParams<ParamTypes>();
  const { t } = useTranslation();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const { colorMode } = useColorMode();
  const { focusActivity } = useContext(
    FocusActivityContext
  ) as FocusActivityContextType;

  const { add: addNotification } = useNotifications();
  const [challengeStatus, setChallengeStatus] = useState<{
    startedAt: string;
    endedAt: string;
    openedAt: string;
  }>();

  //** Active exercise is actually an active ACTIVITY */
  const [activeExercise, setActiveExercise] =
    useState<null | FindChallenge_myChallengeStatus_refs>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [hints, setHints] = useState<
    rewardReceivedStudentSubscription_rewardReceivedStudent_reward[]
  >([]);
  
  // Store exercise data from API
  const [exercisesData, setExercisesData] = useState<{[id: string]: ExerciseData | null}>({});

  // Fetch exercise data
  const fetchExerciseData = async (exerciseId: string) => {
    try {
      //const data = await get_exercise_data(exerciseId, gameId, focusActivity?.playerId || "anonymous"); // to change later
      const data = await get_exercise_data(1,1,1); // hardcoded for testing

      if (data) {
        setExercisesData(prev => ({
          ...prev,
          [exerciseId]: data
        }));
      }
      return data;
    } catch (error) {
      console.error("Error fetching exercise data:", error);
      return null;
    }
  };

  const { error: subUpdatedChallengeStatusError } =
    useSubscription<challengeStatusUpdatedStudentSub>(
      CHALLENGE_STATUS_UPDATED_STUDENT_SUB,
      {
        skip: !gameId,
        variables: { gameId },
        onData: ({ data }) => {
          if (data.data) {
            console.log(
              "Subscription - CHALLENGE STATUS UPDATED",
              data.data
            );
            const challengeStatusUpdated =
              data.data.challengeStatusUpdatedStudent;

            if (challengeStatusUpdated.state === State.FAILED) {
              addNotification({
                status: "warning",
                title: t("timeIsUp.title"),
                description: t("timeIsUp.description"),
              });
            }

            setChallengeStatus({
              endedAt: challengeStatusUpdated.endedAt,
              startedAt: challengeStatusUpdated.startedAt,
              openedAt: challengeStatusUpdated.openedAt,
            });
          }
        },
      }
    );

  const { error: subRewardsError } =
    useSubscription<rewardReceivedStudentSubscription>(
      REWARD_RECEIVED_STUDENT_SUB,
      {
        skip: !gameId,
        variables: { gameId },
        onData: ({ data }) => {
          console.log("Got subscription data", data);

          if (data.data) {
            addNotification({
              status:
                data.data.rewardReceivedStudent.reward.kind ===
                RewardType.HINT
                  ? "info"
                  : "success",
              title: data.data.rewardReceivedStudent.reward.name,
              description:
                data.data.rewardReceivedStudent.reward.description,
              rewardImage:
                data.data.rewardReceivedStudent.reward.image,
              rewardKind:
                data.data.rewardReceivedStudent.reward.kind,
              showFireworks:
                data.data.rewardReceivedStudent.reward.kind ===
                  RewardType.BADGE ||
                data.data.rewardReceivedStudent.reward.kind ===
                  RewardType.VIRTUAL_ITEM,
            });
          }

          if (
            data.data?.rewardReceivedStudent.reward.kind ===
            RewardType.HINT
          ) {
            setHints([
              ...hints,
              data.data.rewardReceivedStudent.reward,
            ]);
          }
        },
      }
    );

  // Add error handling for subscription errors
  useEffect(() => {
    if (subUpdatedChallengeStatusError) {
      console.error("Challenge Status Subscription Error:", {
        message: subUpdatedChallengeStatusError.message,
        graphQLErrors: subUpdatedChallengeStatusError.graphQLErrors,
        networkError: subUpdatedChallengeStatusError.networkError
      });
      console.log("Challenge status subscriptions disabled - app will work without real-time updates");
    }
  }, [subUpdatedChallengeStatusError]);

  useEffect(() => {
    if (subRewardsError) {
      console.error("Rewards Subscription Error:", {
        message: subRewardsError.message,
        graphQLErrors: subRewardsError.graphQLErrors,  
        networkError: subRewardsError.networkError
      });
      console.log("Reward subscriptions disabled - app will work without real-time notifications");
    }
  }, [subRewardsError]);

  const {
    data: activityData,
    error: activityError,
    loading: activityLoading,
  } = useQuery<getActivityById>(GET_ACTIVITY_BY_ID, {
    skip: !activeExercise?.activity?.id,
    variables: { gameId, activityId: activeExercise?.activity?.id },
    fetchPolicy: "no-cache",
    onCompleted: () => {
      console.log("ACTIVITY READY");
    },
  });

  const {
    data: challengeData,
    error: challengeError,
    loading: challengeLoading,
    refetch: challengeRefetch,
  } = useQuery<FindChallenge>(FIND_CHALLENGE, {
    fetchPolicy: "no-cache",
    variables: { gameId, challengeId },
    onCompleted: (data) => {
      if (exerciseId) {
        const exerciseFromURL = data.myChallengeStatus.refs.find(
          (exercise) => exercise.activity?.id === exerciseId
        );
        if (exerciseFromURL) {
          setActiveExercise(exerciseFromURL);
        } else {
          setActiveExercise(data.myChallengeStatus.refs[0]);
        }
      } else {
        if (!activeExercise) {
          setActiveExercise(data.myChallengeStatus.refs[0]);
        }
      }
    },
  });

  // Effect to fetch exercise data when challenge data is loaded
  useEffect(() => {
    if (challengeData && !challengeLoading) {
      challengeData.myChallengeStatus.refs.forEach(exercise => {
        if (exercise.activity?.id) {
          fetchExerciseData(exercise.activity.id);
        }
      });
    }
  }, [challengeData, challengeLoading]);

  const checkIfSolved = (
    challengeData: FindChallenge,
    activeExercise: FindChallenge_myChallengeStatus_refs | null
  ): boolean => {
    if (!challengeStatus) {
      setChallengeStatus({
        startedAt: challengeData.myChallengeStatus.startedAt,
        endedAt: challengeData.myChallengeStatus.endedAt,
        openedAt: challengeData.myChallengeStatus.openedAt,
      });
    }

    if (!activeExercise) {
      return false;
    }

    if (activeExercise.solved) {
      return true;
    }

    return false;
  };

  if (challengeError) {
    console.log("challengeError", challengeError);
  }

  if (!gameId || !challengeId) {
    return <div>Game ID or Challenge ID not provided</div>;
  }

  console.log("CHALLENGE DATA", challengeData);
  console.log("CHALLENGE STATUS", challengeStatus);
  
  /** Redirects to main course page if there are no more unsolved exercises. */
  const setNextUnsolvedExercise = () => {
    if (!challengeData || !activeExercise) {
      console.log("No challengeData or activeExercise available");
      return;
    }

    const refs = challengeData?.myChallengeStatus.refs;
    
    console.log("All Exercises:");
    refs.forEach((ref, index) => {
      const isCurrent = ref.activity?.id === activeExercise.activity?.id;
      
      const apiExerciseData = ref.activity?.id ? exercisesData[ref.activity.id] : null;
      const exerciseTitle = apiExerciseData?.title || ref.activity?.name;
      console.log(`  ${index}: ${exerciseTitle} - ${ref.solved ? 'SOLVED' : 'UNSOLVED'}${isCurrent ? ' CURRENT' : ''}`);
    });
    
    // Find current
    const currentIndex = refs.findIndex(ref => 
      ref.activity?.id === activeExercise.activity?.id
    );
    
    let foundUnsolvedExercise = false;
    let nextExercise = null;

    // First search forward from current position + 1
    for (let i = currentIndex + 1; i < refs.length; i++) {
      if (!refs[i].solved) {
        foundUnsolvedExercise = true;
        nextExercise = refs[i];
        break;
      }
    }

    // If not found, wrap around and search from beginning
    if (!foundUnsolvedExercise) {
      for (let i = 0; i < currentIndex; i++) {
        if (!refs[i].solved) {
          foundUnsolvedExercise = true;
          nextExercise = refs[i];
          break;
        }
      }
    }

    if (foundUnsolvedExercise && nextExercise) {
      const nextApiExerciseData = nextExercise.activity?.id ? exercisesData[nextExercise.activity.id] : null;
      const nextExerciseTitle = nextApiExerciseData?.title || nextExercise.activity?.name;
      console.log(`Setting active exercise to: ${nextExerciseTitle}`);
      setActiveExercise(nextExercise);
    } else {
      console.log("All exercises are solved - redirecting to main course page");
      setShouldRedirect(true);
    }
  };

  if (!challengeLoading && challengeError) {
    const isServerConnectionError = checkIfConnectionAborted(challengeError);

    if (isServerConnectionError) {
      return <Error serverConnectionError />;
    } else {
      return <Error errorContent={challengeError} />;
    }
  }

  if (!challengeData && !challengeLoading) {
    return <div>Couldn't load challengeData</div>;
  }

  if (shouldRedirect) {
    return (
      <Redirect
        to={{
          pathname: `/game/${gameId}`,
        }}
      />
    );
  }

  return (
    <Playground>
      {(challengeLoading || activityLoading) && <MainLoading />}

      {!focusActivity && challengeData?.game.name && (
        <BreadcrumbComponent
          gameName={challengeData.game.name}
          gameId={gameId}
          challengeName={challengeData.myChallengeStatus.challenge.name}
          challengeId={challengeData.myChallengeStatus.challenge.id}
          isChallengeActive={true}
        />
      )}
      <MotionBox
        animate={{
          opacity: sideMenuOpen ? 1 : 0,
        }}
        pointerEvents={sideMenuOpen ? "all" : "none"}
        left={0}
        top={0}
        position="fixed"
        zIndex={998}
        height="100%"
        width="100%"
        backgroundColor="rgba(0,0,0,0.5)"
        onClick={() => {
          setSideMenuOpen(false);
        }}
      />
      <ScrollbarWrapper>
        <Flex h="100%" w="100%">
          <MotionBox
            position={{ base: "fixed", md: "relative" }}
            top={{ base: 0, md: "auto" }}
            background={{
              base: colorMode !== "dark" ? "gray.200" : "gray.900",
              md: "none",
            }}
            zIndex={999}
            left={{ md: "0 !important" }}
            animate={{
              left: sideMenuOpen ? "0%" : "-50%",
            }}
            width={{ base: "50%", md: 2 / 12 }}
            maxWidth={{ base: "100%", md: 330 }}
            height="100%"
            overflowY="scroll"
            borderRight="1px solid rgba(0,0,0,0.1)"
            className="better-scrollbar"
          >
            <Box
              position="absolute"
              left={"calc(100% + 20px)"}
              display={{ base: "block", md: "none" }}
              opacity={sideMenuOpen ? 1 : 0}
              pointerEvents={sideMenuOpen ? "all" : "none"}
            >
              <IconButton
                colorScheme="blue"
                height="50px"
                width="30px"
                position="fixed"
                size="xl"
                zIndex={2000}
                top="50%"
                transform="translate(-50%, -50%)"
                aria-label="Open / Close"
                icon={sideMenuOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                onClick={() => setSideMenuOpen(!sideMenuOpen)}
              />
            </Box>

            {challengeStatus &&
              challengeData?.myChallengeStatus.challenge.mode ===
                Mode.TIME_BOMB &&
              challengeStatus.openedAt &&
              challengeStatus.startedAt &&
              challengeStatus.endedAt && (
                <Flex
                  position="absolute"
                  bottom={10}
                  width="100%"
                  justifyContent="center"
                  height="50px"
                  alignItems="center"
                >
                  <Button cursor="auto" _focus={{}} _active={{}}>
                    <Icon as={BiTimer} marginRight={2} />

                    <Countdown
                      date={dayjs(challengeStatus.endedAt).valueOf()}
                    />
                  </Button>
                </Flex>
              )}
            <Box p={{ base: 1, md: 5 }} h="100%" w="100%" position="relative">
              <Flex
                flexDirection="column"
                alignItems="center"
                w="100%"
                overflowY="hidden"
                data-cy="exercises-list"
              >
                {!challengeLoading &&
                  challengeData &&
                  challengeData.myChallengeStatus.refs.map((exercise, i) => {
                    if (!exercise.activity) {
                      return null;
                    }

                    // Get exercise data from our API if available
                    const apiExerciseData = exercise.activity.id ? exercisesData[exercise.activity.id] : null;
                    const exerciseTitle = apiExerciseData?.title || exercise.activity.name;

                    if (exercise.activity.name && !showExerciseNumbers) {
                      if (isNaN(+exercise.activity.name.split(".")[0])) {
                        setShowExerciseNumbers(true);
                      }
                    }

                    return (
                      <Button
                        marginBottom={2}
                        w="100%"
                        size="sm"
                        fontSize={12}
                        key={i}
                        colorScheme={
                          exercise.activity.id === activeExercise?.activity?.id
                            ? "blue"
                            : "gray"
                        }
                        className={
                          "exercise " +
                          (exercise.activity.id === activeExercise?.activity?.id
                            ? "active"
                            : "")
                        }
                        onClick={() => setActiveExercise(exercise)}
                        rightIcon={exercise.solved ? <CheckIcon /> : undefined}
                        data-cy="exercise-button"
                      >
                        <Text
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {showExerciseNumbers
                            ? `${i + 1}. ${exerciseTitle}`
                            : exerciseTitle}
                        </Text>
                      </Button>
                    );
                  })}
              </Flex>
            </Box>
          </MotionBox>

          {!challengeLoading && challengeData && (
            <Exercise
              setSideMenuOpen={() => {
                setSideMenuOpen(true);
              }}
              gameId={gameId}
              challengeId={challengeId}
              activity={activityData?.activity || null}
              exerciseData={activeExercise?.activity?.id ? exercisesData[activeExercise.activity.id] : null}
              programmingLanguages={challengeData.programmingLanguages}
              challengeRefetch={challengeRefetch}
              solved={checkIfSolved(challengeData, activeExercise)}
              setNextUnsolvedExercise={setNextUnsolvedExercise}
              hints={hints}
              isLoading={challengeLoading || activityLoading}
            />
          )}
        </Flex>
      </ScrollbarWrapper>
    </Playground>
  );
};

export const MotionBox = motion.custom(Box);

const Playground = styled.div`
  position: absolute;
  width: 100%;
  height: calc(100% - 65px);
  top: 65px;
  left: 0;

  & > div {
    width: 100%;
  }
`;

export default withChangeAnimation(Challenge);