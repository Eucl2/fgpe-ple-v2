import {
  ApolloQueryResult,
  gql,
  useLazyQuery,
  useMutation,
  useSubscription,
} from "@apollo/client";
import { Box, Flex, Skeleton } from "@chakra-ui/react";
import { useKeycloak } from "@react-keycloak/web";
import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FocusActivityContextType } from "../../@types/focus-activity";
import { FocusActivityContext } from "../../context/FocusActivityContext";
import { evaluationSubscription } from "../../generated/evaluationSubscription";
import {
  FindChallenge,
  FindChallenge_programmingLanguages,
} from "../../generated/FindChallenge";
import { getActivityById_activity } from "../../generated/getActivityById";
import {
  getLatestSubmissionAndValidation,
  getLatestSubmissionAndValidation_latestSubmission,
  getLatestSubmissionAndValidation_latestValidation,
} from "../../generated/getLatestSubmissionAndValidation";
import { getSubmissionByIdQuery } from "../../generated/getSubmissionByIdQuery";
import { getValidationByIdQuery } from "../../generated/getValidationByIdQuery";
import { Result } from "../../generated/globalTypes";
import { rewardReceivedStudentSubscription_rewardReceivedStudent_reward } from "../../generated/rewardReceivedStudentSubscription";
import { validationSubscription } from "../../generated/validationSubscription";
import { GET_LATEST_SUBMISSION_AND_VALIDATION } from "../../graphql/getLatestSubmissionAndValidation";
import { GET_SUBMISSION_BY_ID } from "../../graphql/getSubmissionById";
import { GET_VALIDATION_BY_ID } from "../../graphql/getValidationById";
import { decryptWithAES, encryptWithAES } from "../../utilities/Encryption";
import { useLazyQuery as useLazyQueryPromise } from "../ExportGameCsvModal";
import { useNotifications } from "../Notifications";
// import Loading from "./Loading";
import EditorMenu from "./EditorMenu";
import { getDefaultProgrammingLangOrFirstFromArray } from "./helpers/defaultProgrammingLanguage";
import EditorSwitcher from "./helpers/EditorSwitcher";
import runPython from "./helpers/python";
import Hints from "./Hints";
import { SettingsContext } from "./SettingsContext";
import Statement, { getStatementHeight } from "./Statement";
import Terminal from "./Terminal";

const isEditorKindSpotBug = (activity?: getActivityById_activity | null) => {
  if (!activity) {
    return false;
  }

  if (activity.editorKind === "SPOT_BUG") {
    return true;
  }

  return false;
};

// const GET_VALIDATION_BY_ID = gql`
//   query getValidationByIdQuery($gameId: String!, $validationId: String!) {
//     validation(gameId: $gameId, id: $validationId) {
//       id
//       game {
//         id
//       }
//       player {
//         id
//       }
//       exerciseId
//       evaluationEngine
//       evaluationEngineId
//       language
//       metrics
//       outputs
//       userExecutionTimes

//       feedback
//       submittedAt
//       evaluatedAt
//       program
//       result
//     }
//   }
// `;

// const GET_SUBMISSION_BY_ID = gql`
//   query getSubmissionByIdQuery($gameId: String!, $submissionId: String!) {
//     submission(gameId: $gameId, id: $submissionId) {
//       id
//       game {
//         id
//       }
//       player {
//         id
//       }
//       exerciseId
//       evaluationEngine
//       evaluationEngineId
//       language
//       metrics
//       result
//       feedback
//       submittedAt
//       evaluatedAt
//       program
//     }
//   }
// `;

const EVALUATE_SUBMISSION = gql`
  mutation evaluateSubmissionQuery(
    $exerciseId: String!
    $gameId: String!
    $file: Upload!
  ) {
    evaluate(gameId: $gameId, exerciseId: $exerciseId, file: $file) {
      id
      game {
        id
      }
      player {
        user {
          username
        }
      }
      feedback
      exerciseId
      evaluationEngine
      evaluationEngineId
    }
  }
`;

const VALIDATE_SUBMISSION = gql`
  mutation validateSubmissionQuery(
    $exerciseId: String!
    $gameId: String!
    $file: Upload!
    $inputs: [String!]!
  ) {
    validate(
      gameId: $gameId
      exerciseId: $exerciseId
      file: $file
      inputs: $inputs
    ) {
      id
      game {
        id
      }
      player {
        user {
          username
        }
      }
      exerciseId
      evaluationEngine
      evaluationEngineId
    }
  }
`;

const VALIDATION_SUBSCRIPTION = gql`
  subscription validationSubscription($gameId: String!) {
    validationProcessedStudent(gameId: $gameId) {
      id
      player {
        id
      }
      exerciseId
      result
      createdAt
      feedback
      outputs
    }
  }
`;

const EVALUATION_SUBSCRIPTION = gql`
  subscription evaluationSubscription($gameId: String!) {
    submissionEvaluatedStudent(gameId: $gameId) {
      id
      player {
        id
      }
      exerciseId
      result
      createdAt
      feedback
    }
  }
`;

// const LATEST_VALIDATION = gql`
//   query latestValidationQuery($gameId: String!, $exerciseId: String!) {
//     latestValidation(gameId: $gameId, exerciseId: $exerciseId) {
//       createdAt
//       feedback
//       result
//       outputs
//       language
//       program
//       id
//     }
//   }
// `;

const getEditorTheme = () => {
  const editorTheme = localStorage.getItem("editorTheme");
  if (editorTheme) {
    return editorTheme;
  }
  return "light";
};

const getTerminalTheme = () => {
  const terminalTheme = localStorage.getItem("terminalTheme");
  if (terminalTheme) {
    return terminalTheme;
  }
  return "light";
};

const getTerminalFontSize = () => {
  const terminalFontSize = localStorage.getItem("terminalFontSize");
  if (terminalFontSize) {
    return terminalFontSize;
  }
  return "14";
};

const isSkulptEnabledLocalStorage = () => {
  const lsSkulptSetting = localStorage.getItem("skulpt");
  if (lsSkulptSetting) {
    return JSON.parse(lsSkulptSetting);
  }

  return true;
};

const Exercise = ({
  gameId,
  activity,
  programmingLanguages,
  challengeRefetch,
  solved,
  setNextUnsolvedExercise,
  challengeId,
  hints,
  setSideMenuOpen,
  isLoading,
}: {
  isLoading: boolean;
  setSideMenuOpen: () => void;
  gameId: string;
  activity: getActivityById_activity | null;
  programmingLanguages: FindChallenge_programmingLanguages[];
  challengeRefetch: (
    variables?: Partial<Record<string, any>> | undefined
  ) => Promise<ApolloQueryResult<FindChallenge>>;
  solved: boolean;
  setNextUnsolvedExercise: () => void;
  challengeId: string;
  hints: rewardReceivedStudentSubscription_rewardReceivedStudent_reward[];
}) => {
  const { add: addNotification } = useNotifications();
  const { t } = useTranslation();

  const [lastEvaluationOrSubmissionId, setLastEvaluationOrSubmissionId] =
    useState<null | string>(null);

  const [activeLanguage, setActiveLanguage] =
    useState<FindChallenge_programmingLanguages>(
      getDefaultProgrammingLangOrFirstFromArray(programmingLanguages, gameId)
    );
  const [code, setCode] = useState<string | null>(null);

  const { keycloak } = useKeycloak();

  const { focusActivity } = useContext(
    FocusActivityContext
  ) as FocusActivityContextType;

  const [isSkulptEnabled, setSkulptEnabled] = useState(
    isSkulptEnabledLocalStorage()
  );

  const [submissionFeedback, setSubmissionFeedback] = useState("Ready");
  const [submissionResult, setSubmissionResult] = useState<Result | null>(null);
  const [validationOutputs, setValidationOutputs] = useState<null | any>(null);

  const [isWaitingForEvaluationResult, setWaitingForEvaluationResult] =
    useState(false);
  const [isWaitingForValidationResult, setWaitingForValidationResult] =
    useState(false);

  const [connectionProblem, setConnectionProblem] = useState(false);

  const [, setEvaluationId] = useState<null | string>(null);

  const [, setEditorTheme] = useState("light");
  const [, setTerminalTheme] = useState("light");
  const [, setTerminalFontSize] = useState("18");

  const [testValues, setTestValues] = useState<string[]>([""]);

  const activityRef = useRef<getActivityById_activity | null>(null);
  const activeLanguageRef =
    useRef<FindChallenge_programmingLanguages>(activeLanguage);
  const isEvaluationFetchingRef = useRef<boolean>(isWaitingForEvaluationResult);
  const isValidationFetchingRef = useRef<boolean>(isWaitingForValidationResult);
  const codeRef = useRef<string | null>(code);
  const [, setRestoreAvailable] = useState(false);

  //** Added to use with local code interpreters like Skulpt (Python) */
  const stopExecution = useRef(false);
  const additionalOutputs = useRef<string[]>([]);

  const reloadCode = () => {
    setCode(null);
    clearPlayground();
    saveSubmissionDataInLocalStorage("", null, true, null, "");
  };

  const getCodeSkeleton = (dontSetCode?: boolean, getArray?: boolean) => {
    if (activity) {
      if (activity?.codeSkeletons) {
        const codeSkeletons = activity?.codeSkeletons;
        let allCodeSkeletonsForActiveLang: string[] = [];
        for (let i = 0; i < codeSkeletons.length; i++) {
          if (codeSkeletons[i].extension === activeLanguage.extension) {
            if (!dontSetCode) {
              setCode(codeSkeletons[i].code || "");
            }

            if (!getArray) {
              return codeSkeletons[i].code;
            } else {
              allCodeSkeletonsForActiveLang.push(codeSkeletons[i].code || "");
            }
          }
        }
        if (getArray) {
          return allCodeSkeletonsForActiveLang;
        }
      }
    }

    return "";
  };

  const saveCodeToLocalStorage = (codeToSave: string) => {
    if (activity && keycloak.profile?.email) {
      const userDataLocalStorage = localStorage.getItem(
        `FGPE_${keycloak.profile?.username}_game_${gameId}_chall_${activity?.id}`
      );
      if (userDataLocalStorage) {
        const userData = JSON.parse(userDataLocalStorage);
        const encryptedCode = encryptWithAES(
          codeToSave,
          keycloak.profile?.email
        );
        const userDataWithNewCode = {
          ...userData,
          code: encryptedCode,
          language: activeLanguage.name,
        };
        localStorage.setItem(
          `FGPE_${keycloak.profile?.username}_game_${gameId}_chall_${activity?.id}`,
          JSON.stringify(userDataWithNewCode)
        );
      } else {
        saveSubmissionDataInLocalStorage("", null, true, null, codeToSave);
      }
    }
  };

  const getLatestSubmissionAndValidation =
    useLazyQueryPromise<getLatestSubmissionAndValidation>(
      GET_LATEST_SUBMISSION_AND_VALIDATION
    );

  const restoreSubmission = (
    latestSubmission: getLatestSubmissionAndValidation_latestSubmission
  ) => {
    restoreLatestAttemptExcludingSpecificParameters({
      program: latestSubmission.program,
      language: latestSubmission.language,
      result: latestSubmission.result,
      feedback: latestSubmission.result,
    });

    saveSubmissionDataInLocalStorage(
      latestSubmission.feedback || "",
      latestSubmission.result,
      true,
      undefined,
      latestSubmission.program || ""
    );
  };

  const restoreValidation = (
    latestValidation: getLatestSubmissionAndValidation_latestValidation
  ) => {
    restoreLatestAttemptExcludingSpecificParameters({
      program: latestValidation.program,
      language: latestValidation.language,
      result: latestValidation.result,
      feedback: latestValidation.result,
    });

    if (latestValidation.outputs) {
      setValidationOutputs(latestValidation.outputs);
    } else {
      setValidationOutputs(null);
    }

    saveSubmissionDataInLocalStorage(
      latestValidation.feedback || "",
      latestValidation.result,
      true,
      latestValidation.outputs,
      latestValidation.program || ""
    );
  };

  const restoreLatestAttemptExcludingSpecificParameters = ({
    program,
    language,
    result,
    feedback,
  }: {
    program?: any;
    language: any;
    result?: any;
    feedback?: any;
  }) => {
    setCode(program || "");

    for (let i = 0; i < programmingLanguages.length; i++) {
      if (programmingLanguages[i].name === language) {
        setActiveLanguage(programmingLanguages[i]);
      }
    }

    if (result) {
      if (result === Result.ACCEPT) {
        setSubmissionResult(null);
      } else {
        setSubmissionResult(result);
      }
    } else {
      setSubmissionResult(null);
    }

    if (feedback) {
      setSubmissionFeedback(feedback);
    } else {
      setSubmissionFeedback("");
    }
  };

  const restoreLatestSubmissionOrValidation = async () => {
    if (!activity) {
      return;
    }
    const submissionAndValidation = await getLatestSubmissionAndValidation({
      gameId,
      exerciseId: activity.id,
    }).catch((err) => {
      console.log("RESTORE ERROR", err);
      addNotification({
        title: t("error.unknownProblem.title"),
        description: t("error.unknownProblem.description"),
        status: "error",
      });
    });

    if (!submissionAndValidation) {
      return;
    }

    if (!submissionAndValidation.data) {
      addNotification({
        title: t("error.unknownProblem.title"),
        description: t("error.unknownProblem.description"),
        status: "error",
      });
      return;
    }

    const {
      data: { latestSubmission, latestValidation },
    } = submissionAndValidation;
    if (latestSubmission && !latestValidation) {
      restoreSubmission(latestSubmission);
    }

    if (latestValidation && !latestSubmission) {
      restoreValidation(latestValidation);
    }

    if (latestValidation && latestSubmission) {
      const validationDate = dayjs(latestValidation.createdAt);
      const submissionDate = dayjs(latestSubmission.createdAt);
      if (validationDate.diff(submissionDate) > 0) {
        restoreValidation(latestValidation);
      } else {
        restoreSubmission(latestSubmission);
      }
    }

    // const latestValidation = await refetchLastValidation();

    // if (!latestValidation.data) {
    //   return;
    // }

    // const latestValidationData = latestValidation.data.latestValidation;

    // if (!latestValidationData) {
    //   return;
    // }

    // setCode(latestValidationData.program || "");

    // for (let i = 0; i < programmingLanguages.length; i++) {
    //   if (programmingLanguages[i].name === latestValidationData.language) {
    //     setActiveLanguage(programmingLanguages[i]);
    //   }
    // }

    // if (latestValidationData.outputs) {
    //   setValidationOutputs(latestValidationData.outputs);
    // } else {
    //   setValidationOutputs(null);
    // }

    // if (latestValidationData.feedback) {
    //   setSubmissionFeedback(latestValidationData.feedback);
    // } else {
    //   setSubmissionFeedback("");
    // }

    // if (latestValidationData.result) {
    //   if (latestValidationData.result === Result.ACCEPT) {
    //     setSubmissionResult(null);
    //   } else {
    //     setSubmissionResult(latestValidationData.result);
    //   }
    // } else {
    //   setSubmissionResult(null);
    // }

    // saveSubmissionDataInLocalStorage(
    //   latestValidationData.feedback || "",
    //   latestValidationData.result,
    //   true,
    //   latestValidationData.outputs,
    //   latestValidationData.program || ""
    // );
  };

  useEffect(() => {
    isEvaluationFetchingRef.current = isWaitingForEvaluationResult;
    isValidationFetchingRef.current = isWaitingForValidationResult;
    activityRef.current = activity;
    activeLanguageRef.current = activeLanguage;
    codeRef.current = code;
  });

  useEffect(() => {
    const maxTime = 120;
    const timeoutID = setTimeout(() => {
      if (isValidationFetchingRef.current || isEvaluationFetchingRef.current) {
        setConnectionProblem(true);
      }
    }, 1000 * maxTime);
    return () => clearInterval(timeoutID);
  }, [isWaitingForEvaluationResult, isWaitingForValidationResult]);

  // const {
  //   data: lastValidationData,
  //   error: lastValidationError,
  //   loading: lastValidationLoading,
  //   refetch: refetchLastValidation,
  // } = useQuery<latestValidationQuery>(LATEST_VALIDATION, {
  //   variables: { gameId, exerciseId: activity?.id },
  //   skip: activity ? false : true,
  //   fetchPolicy: "no-cache",
  // });

  const getLastStateFromLocalStorage = (
    lastSubmissionFeedbackUnparsed: any
  ) => {
    try {
      if (lastSubmissionFeedbackUnparsed) {
        const parsedLastSubmission = JSON.parse(lastSubmissionFeedbackUnparsed);
        if (parsedLastSubmission.code) {
          if (keycloak.profile?.email) {
            const encryptedCode = decryptWithAES(
              parsedLastSubmission.code,
              keycloak.profile.email
            );

            setCode(encryptedCode);
          }
        }

        // console.log("GOT", parsedLastSubmission);
        if (parsedLastSubmission.submissionFeedback !== undefined) {
          setSubmissionFeedback(parsedLastSubmission.submissionFeedback);
          // console.log("setting feedback");
        } else {
          setSubmissionFeedback("Ready");
          // console.log("setting feedback - ready");
        }

        if (parsedLastSubmission.language) {
          for (let i = 0; i < programmingLanguages.length; i++) {
            if (
              programmingLanguages[i].name === parsedLastSubmission.language
            ) {
              setActiveLanguage(programmingLanguages[i]);
            }
          }
        }

        if (parsedLastSubmission.submissionResult) {
          if (parsedLastSubmission.isValidation) {
            if (parsedLastSubmission.submissionResult === Result.ACCEPT) {
              setSubmissionResult(null);
            } else {
              setSubmissionResult(parsedLastSubmission.submissionResult);
            }
          } else {
            setSubmissionResult(parsedLastSubmission.submissionResult);
          }
        } else {
          setSubmissionResult(null);
        }

        if (parsedLastSubmission.validationOutputs) {
          setValidationOutputs(parsedLastSubmission.validationOutputs);
        } else {
          setValidationOutputs(null);
        }
      } else {
        clearPlayground();
      }
    } catch (err) {
      clearPlayground();
    }
  };

  const getAndSetLatestStateFromLocalStorageOrClear = () => {
    setCode(null);

    if (activity?.id) {
      const lastSubmissionFeedbackUnparsed = localStorage.getItem(
        `FGPE_${keycloak.profile?.username}_game_${gameId}_chall_${activity?.id}`
      );
      getLastStateFromLocalStorage(lastSubmissionFeedbackUnparsed);
    } else {
      clearPlayground();
    }
  };

  useEffect(() => {
    // setSubmissionResult(null);
    setWaitingForEvaluationResult(false);
    setWaitingForValidationResult(false);

    getAndSetLatestStateFromLocalStorageOrClear();
  }, [activity]);

  useEffect(() => {
    if (submissionResult === Result.ACCEPT) {
      // console.log("Challenge refresh!");
      challengeRefetch();
    }
  }, [submissionResult]);

  const saveSubmissionDataInLocalStorage = (
    submissionFeedback: string,
    submissionResult: Result | null,
    isValidation: boolean,
    validationOutputs?: any,
    codeToSave?: string
  ) => {
    if (activity?.id) {
      if (keycloak.profile?.email) {
        localStorage.setItem(
          `FGPE_${keycloak.profile?.username}_game_${gameId}_chall_${activity?.id}`,
          JSON.stringify({
            code: encryptWithAES(
              typeof codeToSave !== "undefined" ? codeToSave : code,
              keycloak.profile.email
            ),
            submissionFeedback,
            submissionResult,
            validationOutputs,
            isValidation,
            time: new Date(),
            language: activeLanguage.name,
          })
        );
      }
    }
  };

  const [getSubmissionById] = useLazyQuery<getSubmissionByIdQuery>(
    GET_SUBMISSION_BY_ID,
    {
      onError(data) {
        console.log("[GET SUBMISSION BY ID ERROR]", data);
      },
      onCompleted(data) {
        console.log("[GET SUBMISSION BY ID]", data);
        if (
          data.submission.id == lastEvaluationOrSubmissionId &&
          lastEvaluationOrSubmissionId
        ) {
          console.log("[SUBMISSION] Already processed");
          setWaitingForEvaluationResult(false);
        }
      },
      fetchPolicy: "network-only",
    }
  );

  const { error: subEvaluationError } = useSubscription<evaluationSubscription>(
    EVALUATION_SUBSCRIPTION,
    {
      variables: { gameId },
      onSubscriptionData: ({ subscriptionData }) => {
        console.log(
          "[SUB] EVALUATION",
          subscriptionData.data?.submissionEvaluatedStudent.id
        );
        const newSubscriptionId =
          subscriptionData.data?.submissionEvaluatedStudent.id;
        setLastEvaluationOrSubmissionId(newSubscriptionId || null);

        if (
          lastEvaluationOrSubmissionId == newSubscriptionId &&
          newSubscriptionId
        ) {
          return;
        }

        // if (isWaitingForEvaluationResult) {
        if (subscriptionData.data) {
          setRestoreAvailable(true);

          const evaluationData =
            subscriptionData.data.submissionEvaluatedStudent;
          setSubmissionResult(evaluationData.result);
          setSubmissionFeedback(evaluationData.feedback || "");
          setValidationOutputs(null);
          setWaitingForEvaluationResult(false);

          if (focusActivity) {
            sendLastGradeToLtiPlatform();
          }

          saveSubmissionDataInLocalStorage(
            evaluationData.feedback || "",
            evaluationData.result,
            false,
            null
          );
        }
        // }
      },
    }
  );

  const { error: subValidationError } = useSubscription<validationSubscription>(
    VALIDATION_SUBSCRIPTION,
    {
      variables: { gameId },
      onSubscriptionData: ({ subscriptionData }) => {
        const newValidationId =
          subscriptionData.data?.validationProcessedStudent.id;
        setLastEvaluationOrSubmissionId(newValidationId || null);

        if (
          lastEvaluationOrSubmissionId == newValidationId &&
          newValidationId
        ) {
          return;
        }

        // if (isWaitingForValidationResult) {
        console.log("Sub data", subscriptionData);

        if (subscriptionData.data) {
          setRestoreAvailable(true);
          const validationData =
            subscriptionData.data.validationProcessedStudent;

          setValidationOutputs(validationData?.outputs);
          setSubmissionFeedback(validationData?.feedback || "");
          setWaitingForValidationResult(false);

          if (validationData.result === Result.ACCEPT) {
            setSubmissionResult(null);
          } else {
            setSubmissionResult(validationData.result);
          }

          saveSubmissionDataInLocalStorage(
            validationData?.feedback || "",
            validationData.result,
            true,
            validationData?.outputs
          );
        }
        // }
      },
    }
  );

  const [getValidationById] = useLazyQuery<getValidationByIdQuery>(
    GET_VALIDATION_BY_ID,
    {
      onCompleted(data) {
        console.log("[GET VALIDATION BY ID]", data);
      },
      fetchPolicy: "network-only",
    }
  );

  const [evaluateSubmissionMutation] = useMutation(EVALUATE_SUBMISSION, {
    onError(data) {
      console.log("[EVALUATION ERROR]");
    },
    onCompleted(data) {
      const submissionId = data.evaluate.id;
      console.log("[EVALUATE MUTATION DATA]", data);
      console.log("[SUBMISSION ID]", submissionId);
      console.log("QUERY DATA", {
        variables: { gameId, submissionId },
      });
      setWaitingForEvaluationResult(true);

      // if (
      //   submissionId == lastEvaluationOrSubmissionId &&
      //   lastEvaluationOrSubmissionId
      // ) {
      //   console.log("[EVALUATION] Already processed");
      //   setWaitingForEvaluationResult(false);
      // }

      // setFetchingCount(0);
      setEvaluationId(submissionId);
      getSubmissionById({
        variables: { gameId, submissionId },
      });
    },
  });

  const [validateSubmissionMutation] = useMutation(VALIDATE_SUBMISSION, {
    onCompleted(data) {
      const validationId = data.validate.id;
      // console.log("[VALIDATE MUTATION DATA]", data);
      // console.log("[VALIDATION ID]", validationId);
      if (
        validationId == lastEvaluationOrSubmissionId &&
        lastEvaluationOrSubmissionId
      ) {
        console.log("[VALIDATION] Already processed");
        setWaitingForEvaluationResult(false);
      }

      // setFetchingCount(0);
      // setValidationId(validationId);
      // getValidationById({
      //   variables: { gameId, validationId },
      // });
    },
  });

  const getFileFromCode = (isSpotBugMode?: boolean) => {
    if (!codeRef.current) {
      return;
    }
    const blob = new Blob([codeRef.current], { type: "text/plain" });
    const file = new File(
      [blob],
      `Solution.${isSpotBugMode ? "txt" : activeLanguageRef.current.extension}`
    );

    return file;
  };

  const evaluateSubmission = (isSpotBugMode?: boolean) => {
    clearPlayground();
    // setEvaluationFetching(true);
    // setFetchingCount(0);
    if (isEvaluationFetchingRef.current) {
      return;
    }
    if (!activityRef.current) {
      return;
    } else console.log("[EVALUATE SUBMISSION]");

    const file = getFileFromCode(isSpotBugMode);

    evaluateSubmissionMutation({
      variables: {
        file,
        gameId,
        exerciseId: activityRef.current?.id,
      },
    });
  };

  const validateSubmission = () => {
    clearPlayground();

    if (isValidationFetchingRef.current) {
      return;
    }
    if (!activityRef.current) {
      return;
    } else console.log("[VALIDATE SUBMISSION]");

    const file = getFileFromCode();
    // console.log("INPUTS", testValues);

    setWaitingForValidationResult(true);

    validateSubmissionMutation({
      variables: {
        file,
        gameId,
        exerciseId: activityRef.current?.id,
        inputs: testValues,
      },
    });
  };

  const clearPlayground = (isLocal?: boolean) => {
    setSubmissionResult(null);
    setSubmissionFeedback("Ready");
    setValidationOutputs(null);
    if (isLocal) {
      additionalOutputs.current = [];
      stopExecution.current = false;
    }
  };

  const sendLastGradeToLtiPlatform = async () => {
    const res = await axios.post(
      `${process.env.REACT_APP_API_URI}/lti/grade`,
      {
        game: focusActivity?.gameId,
        challenge: focusActivity?.challengeId,
        activity: focusActivity?.activityId,
      },
      {
        headers: {
          Authorization: `Bearer ${focusActivity?.ltik}`,
        },
      }
    );

    console.log(res.data);
  };

  return (
    <SettingsContext.Provider
      value={{
        editorTheme: getEditorTheme(),
        setEditorTheme,
        terminalTheme: getTerminalTheme(),
        setTerminalTheme,
        terminalFontSize: getTerminalFontSize(),
        setTerminalFontSize,
        isSkulptEnabled,
        setSkulptEnabled,
      }}
    >
      {/* {!subValidationLoading && (
        <span>{subValidationData?.validationProcessedStudent.result}</span>
      )} */}
      <Box width={"100%"} height={"100%"} m={0} p={0}>
        <Box position="relative">
          <Skeleton isLoaded={!isLoading}>
            <Statement activity={activity} gameId={gameId} />
          </Skeleton>

          <Hints challengeId={challengeId} gameId={gameId} hints={hints} />
        </Box>
        <EditorMenu
          setStopExecution={(v: boolean) => {
            stopExecution.current = v;
            console.log("stopped?", stopExecution.current);
          }}
          gameId={gameId}
          setSideMenuOpen={setSideMenuOpen}
          editorKind={activity?.editorKind}
          reload={reloadCode}
          submissionResult={submissionResult}
          activeLanguage={activeLanguage}
          setActiveLanguage={(l) => {
            // LOSING CODE....

            setCode(null);
            setActiveLanguage(l);
            // getAndSetLatestStateFromLocalStorageOrClear();
          }}
          evaluateSubmission={evaluateSubmission}
          validateSubmission={
            activeLanguage.name?.substring(0, 6).toLowerCase() === "python" &&
            isSkulptEnabled
              ? async () => {
                  clearPlayground(true);
                  
                  // 1. Get current exercise data
                  const exercise = props.activity; // From your mock
                  
                  // 2. Basic checksource validation
                  if (exercise.checksource && !code?.includes('def add(')) {
                    setSubmissionFeedback("Error: You must define an 'add(a, b)' function");
                    setSubmissionResult(Result.RUNTIME_ERROR);
                    return;
                  }
          
                  // 3. Combine all code parts
                  const fullCode = [
                    exercise.precode,
                    code,
                    exercise.postcode,
                    exercise.testcode
                  ].filter(Boolean).join('\n');
          
                  // 4. Execute with Skulpt
                  try {
                    await new Promise((resolve) => {
                      runPython({
                        code: fullCode,
                        setLoading: setWaitingForValidationResult,
                        setOutput: (output) => additionalOutputs.current.push(output),
                        setResult: setSubmissionResult,
                        stopExecution,
                        onFinish: () => {},
                        onSuccess: () => {
                          setSubmissionFeedback("All tests passed!");
                          setValidationOutputs(additionalOutputs.current);
                          resolve(true);
                        },
                        onError: (err) => {
                          setSubmissionFeedback(`Test failed: ${err}`);
                          setSubmissionResult(Result.RUNTIME_ERROR);
                          resolve(false);
                        }
                      });
                    });
                  } catch (error) {
                    setSubmissionFeedback(`Error: ${error}`);
                  }
                }
              : validateSubmission // ← Leave server version as-is
          }
          isValidationFetching={isWaitingForValidationResult}
          isEvaluationFetching={isWaitingForEvaluationResult}
          // setFetchingCount={setFetchingCount}
          restore={restoreLatestSubmissionOrValidation}
          setSubmissionFetching={setWaitingForEvaluationResult}
          programmingLanguages={programmingLanguages}
          setValidationFetching={setWaitingForValidationResult}
          testValues={testValues}
          setTestValues={setTestValues}
          solved={solved}
          setNextUnsolvedExercise={setNextUnsolvedExercise}
          connectionError={
            subValidationError || subEvaluationError || connectionProblem
          }
          isRestoreAvailable={true}

          // REMOVED TO INCREASE SERVER PERFORMANCE
          // isRestoreAvailable={
          //   (isRestoreAvailable || (lastValidationError ? false : true)) &&
          //   !lastValidationLoading
          // }
        />

        <Skeleton
          height={`calc(100% - ${getStatementHeight(activity) + 50}px)`}
          minHeight={500}
          flexDirection={{ base: "column", md: "row" }}
          as={Flex}
          isLoaded={!isLoading}
        >
          <Box
            width={{
              base: "99%",
              md: isEditorKindSpotBug(activity) ? "100%" : "58%",
            }}
            height={{ base: "50vh", md: "100%" }}
            minHeight="50vh"
            p={0}
            m={0}
          >
            {
              <EditorSwitcher
                editorKind={activity?.editorKind}
                language={activeLanguage}
                code={code === null ? getCodeSkeleton() : code}
                codeSkeletons={getCodeSkeleton(true, true) || ""}
                setCode={(code) => {
                  saveCodeToLocalStorage(code);
                  setCode(code);
                }}
                evaluateSubmission={evaluateSubmission}
                validateSubmission={validateSubmission}
              />
            }
            {/* <CodeEditor
              language={activeLanguage}
              code={code === "" ? getCodeSkeleton() : code}
              setCode={(code) => {
                saveCodeToLocalStorage(code);
                setCode(code);
              }}
              evaluateSubmission={evaluateSubmission}
              validateSubmission={validateSubmission}
            /> */}
          </Box>
          {!isEditorKindSpotBug(activity) && (
            <Box
              width={{ base: "99%", md: "42%" }}
              height={{ base: "50vh", md: "100%" }}
              minHeight="50vh"
            >
              <Terminal
                activeLanguage={activeLanguage}
                submissionFeedback={submissionFeedback}
                submissionResult={submissionResult}
                validationOutputs={validationOutputs}
                loading={
                  isWaitingForValidationResult || isWaitingForEvaluationResult
                }
              />
            </Box>
          )}
        </Skeleton>
      </Box>
    </SettingsContext.Provider>
  );
};

// const Terminal = styled.div<{ terminalTheme: string }>`
//   position: relative;
//   height: 100%;
//   width: 100%;
//   background-color: ${({ terminalTheme }) =>
//     terminalTheme === "dark" ? "#323232" : "white"};
//   color: ${({ terminalTheme }) =>
//     terminalTheme === "dark" ? "white" : "#121212"};
//   padding: 12px;
//   margin: 0px;
//   font-size: 13px;
//   font-family: "Source Code Pro", monospace;
//   overflow-y: auto;
//   overflow-x: hidden;
//   word-wrap: break-word;
//   & > div {
//     margin: auto;
//     width: 90%;
//     position: absolute;
//   }
// `;

export default Exercise;
