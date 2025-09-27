import { processGameEvent, loadWasmModule } from './wasm-service';
import {
  ApolloQueryResult,
} from "@apollo/client";
import { Box, Flex, Skeleton, useToast } from "@chakra-ui/react";
import { useKeycloak } from "@react-keycloak/web";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FocusActivityContextType } from "../../@types/focus-activity";
import { FocusActivityContext } from "../../context/FocusActivityContext";
import {
  FindChallenge,
  FindChallenge_programmingLanguages,
} from "../../generated/FindChallenge";
import { getActivityById_activity } from "../../generated/getActivityById";
import { Result } from "../../generated/globalTypes";
import { rewardReceivedStudentSubscription_rewardReceivedStudent_reward } from "../../generated/rewardReceivedStudentSubscription";
import { decryptWithAES, encryptWithAES } from "../../utilities/Encryption";
import { stringToNumber } from '../../utilities/StringUtils';
import { useNotifications } from "../Notifications";
import EditorMenu from "./EditorMenu";
import { getDefaultProgrammingLangOrFirstFromArray } from "./helpers/defaultProgrammingLanguage";
import EditorSwitcher from "./helpers/EditorSwitcher";
import runPython from "./helpers/python";
import Hints from "./Hints";
import { SettingsContext } from "./SettingsContext";
import Statement, { getStatementHeight } from "./Statement";
import Terminal from "./Terminal";
import { executeCheckSource, ExerciseData } from "./ExerciseData";
import { runCpp } from './helpers/JSCPP-NG';

const isEditorKindSpotBug = (activity?: getActivityById_activity | null) => {
  if (!activity) {
    return false;
  }

  if (activity.editorKind === "SPOT_BUG") {
    return true;
  }

  return false;
};

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
  exerciseData,
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
  exerciseData: ExerciseData | null;
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
  const toast = useToast();
  const { t } = useTranslation();

  const [isExerciseDataLoading, setIsExerciseDataLoading] = useState(false);

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
  const [isWasmLoading, setIsWasmLoading] = useState(false);

  const [connectionProblem, setConnectionProblem] = useState(false);

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

  // Added to use with local code interpreters like Skulpt (Python)
  const stopExecution = useRef(false);
  const additionalOutputs = useRef<string[]>([]);

  useEffect(() => {
    if (exerciseData) {
      setIsExerciseDataLoading(false);
      // Initialize editor with initcode
      const lang = activeLanguage;
      if (lang.id && exerciseData.languageData[lang.id].initcode) {
        setCode(exerciseData.languageData[lang.id].initcode);
      }
    }
  }, [exerciseData]);

  const reloadCode = () => {
    const lang = activeLanguage;
    if (exerciseData && lang.id && exerciseData.languageData[lang.id] && exerciseData.languageData[lang.id].initcode) {
      setCode(exerciseData.languageData[lang.id].initcode);
    } else {
      setCode(null);
    }
    clearPlayground();
    saveSubmissionDataInLocalStorage("", null, true, null, "");
  };

  const getCodeSkeleton = (dontSetCode?: boolean, getArray?: boolean) => {
    // If we have exercise data from our function, use that instead
    const lang = activeLanguage;
    if (exerciseData && lang.id && exerciseData.languageData[lang.id] && exerciseData.languageData[lang.id].initcode) {
      if (!dontSetCode) {
        setCode(exerciseData.languageData[lang.id].initcode);
      }
      return exerciseData.languageData[lang.id].initcode;
    }

    // Fallback to original method
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

        if (parsedLastSubmission.submissionFeedback !== undefined) {
          setSubmissionFeedback(parsedLastSubmission.submissionFeedback);
        } else {
          setSubmissionFeedback("Ready");
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
    setWaitingForEvaluationResult(false);
    setWaitingForValidationResult(false);

    getAndSetLatestStateFromLocalStorageOrClear();
  }, [activity]);

  useEffect(() => {
    if (submissionResult === Result.ACCEPT) {
      // If solved successfully, update challenge status
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

  const evaluateSubmission = async (isSpotBugMode?: boolean) => {
    clearPlayground();
    console.log("evaluateSubmission");

    if (!exerciseData) {
      addNotification({
        title: t("error.unknownProblem.title"),
        description: "Exercise data not available",
        status: "error",
      });
      return;
    }

    if (!code) {
      addNotification({
        title: t("playground.feedback.noCode.title"),
        description: t("playground.feedback.noCode.description"),
        status: "warning",
      });
      return;
    }

    setWaitingForEvaluationResult(true);

    try {
      const lang = activeLanguage;
      if (!lang.id) {
        throw new Error("Missing programming language ID");
      }
      const langData = exerciseData.languageData[lang.id];
      if (!langData) {
        throw new Error("Programming language data is undefined");
      }

      //run checksource to verify if solution meets requirements
      const checksourceResult = await executeCheckSource(code, exerciseData.languageData[lang.id].checksource);

      if (checksourceResult !== 'OK') {
        setSubmissionFeedback(checksourceResult);
        setSubmissionResult(Result.COMPILATION_ERROR);
        setWaitingForEvaluationResult(false);

        saveSubmissionDataInLocalStorage(
          checksourceResult,
          Result.COMPILATION_ERROR,
          false,
          null
        );
        return;
      }

      //run test code
      const fullCode = `${langData.pretestcode}${code}${langData.posttestcode}`;
      additionalOutputs.current = [];

      // Use different execution based on language
      console.log("activeLanguage", activeLanguage);

      if (activeLanguage.name?.substring(0, 6).toLowerCase() === "python" && isSkulptEnabled) {

        try {
          await loadWasmModule();
        } catch (err) {
          console.error("Failed to load WASM module:", err);
          setSubmissionResult(Result.RUNTIME_ERROR);
          setSubmissionFeedback("Failed to initialize code execution environment");
          setWaitingForEvaluationResult(false);
          return;
        }
        // Python with Skulpt
        let errors: { content: string; index: number }[] = [];

        await new Promise((resolve) => {
          runPython({
            code: fullCode,
            setLoading: setWaitingForEvaluationResult,
            setOutput: (v: string) => {
              additionalOutputs.current = [...additionalOutputs.current, v];
            },
            setResult: (v: Result) => {
              setSubmissionResult(v);
            },
            stopExecution,
            getInput: () => undefined,
            onFinish: () => { },
            onSuccess: () => {
              setSubmissionResult(Result.ACCEPT);
              setSubmissionFeedback("All tests passed!");
              setValidationOutputs(additionalOutputs.current);

              try {
                console.log("Debug - keycloak.profile:", keycloak.profile);
                console.log("Debug - activity?.id:", activity?.id);
                console.log("Debug - gameId:", gameId);
                console.log("Debug - Numbers:", {
                  playerId: Number(keycloak.profile?.id || "1"),
                  exerciseId: Number(activity?.id || "1"),
                  gameId: Number(gameId || "1")
                });
                const eventData = {
                  eventType: "submit",
                  eventResult: 100,
                  playerId: stringToNumber(keycloak.profile?.id || "1"),
                  exerciseId: stringToNumber(activity?.id || "1"),
                  gameId: stringToNumber(gameId || "1")
                };

                console.log("Sending event to WASM:", eventData);

                processGameEvent(eventData).then(gameResult => {
                  console.log("Processing WASM gameResult:", gameResult);

                  let notificationShown = false;

                  if (gameResult && gameResult.results && Array.isArray(gameResult.results) && gameResult.results.length > 0) {
                    gameResult.results.forEach((result: any) => {
                      if (Array.isArray(result) && result.length >= 2 && result[0] === "Message") {
                        if (Array.isArray(result[1]) && result[1].length > 0) {
                          addNotification({
                            title: "Achievement",
                            description: result[1][0],
                            status: "success",
                          });
                          notificationShown = true;
                        }
                      }
                    });
                  }

                  // If no notification shown but game state was updated, shows a fallback notification
                  if (!notificationShown && gameResult && gameResult.game_state) {
                    addNotification({
                      title: t("playground.feedback.solutionAccepted.title"),
                      description: t("playground.feedback.solutionAccepted.description"),
                      status: "success",
                    });
                  }
                }).catch(wasmError => {
                  console.error("WASM processing error:", wasmError);
                });
              } catch (wasmError) {
                console.error("WASM processing error:", wasmError);
              }

              resolve(true);
            },
            onError: (err: string) => {
              errors.push({
                content: err,
                index: 0,
              });

              setSubmissionFeedback(err);
              setSubmissionResult(Result.RUNTIME_ERROR);
              setValidationOutputs(additionalOutputs.current);
              resolve(true);
            },
          });
        });
      } else if (/*activeLanguage.id?.toUpperCase() === "C" ||*/ activeLanguage.id?.toUpperCase() === "CPP") {
        try {
          await loadWasmModule();
        } catch (err) {
          console.error("Failed to load WASM module:", err);
          setSubmissionResult(Result.RUNTIME_ERROR);
          setSubmissionFeedback("Failed to initialize code execution environment");
          setWaitingForEvaluationResult(false);
          return;
        }
        let pass: boolean = false;
        // JSCPP-NG for C/C++
        let errors: { content: string; index: number }[] = [];
        // fullText : string
        // setWaitingForEvaluationResult: Dispatch<SetStateAction<boolean>>
        // setSubmissionResult: (value: SetStateAction<Result | null>) => void
        // setSubmissionFeedback: (value: SetStateAction<string>) => void
        // setWaitingForEvaluationResult: (value: SetStateAction<boolean>) => void
        // setValidationOutputs: (value: string[]) => void
        // stopExecution: { current: boolean }
        // additionalOutputs: MutableRefObject<string[]>
        await new Promise((resolve) => {
          runCpp({
            code: fullCode,
            setLoading: setWaitingForEvaluationResult,
            setOutput: (v: string) => {
              additionalOutputs.current = [...additionalOutputs.current, v];
            },
            setResult: (v: Result) => {
              setSubmissionResult(v);
            },
            stopExecution,
            getInput: undefined,
            addFile: () => { throw new Error("addFile: Not yet implemented"); },
            onFinish: () => {
              setValidationOutputs(additionalOutputs.current);
              if (!pass) {
                setSubmissionResult(Result.WRONG_ANSWER);
              }
            },
            onSuccess: () => {
              pass = true;
              setSubmissionResult(Result.ACCEPT);
              setSubmissionFeedback("All tests passed!");

              try {
                console.log("Debug - keycloak.profile:", keycloak.profile);
                console.log("Debug - activity?.id:", activity?.id);
                console.log("Debug - gameId:", gameId);
                console.log("Debug - Numbers:", {
                  playerId: Number(keycloak.profile?.id || "1"),
                  exerciseId: Number(activity?.id || "1"),
                  gameId: Number(gameId || "1")
                });
                const eventData = {
                  eventType: "submit",
                  eventResult: 100,
                  playerId: stringToNumber(keycloak.profile?.id || "1"),
                  exerciseId: stringToNumber(activity?.id || "1"),
                  gameId: stringToNumber(gameId || "1")
                };

                console.log("Sending event to WASM:", eventData);

                processGameEvent(eventData).then(gameResult => {
                  console.log("Processing WASM gameResult:", gameResult);

                  let notificationShown = false;

                  if (gameResult && gameResult.results && Array.isArray(gameResult.results) && gameResult.results.length > 0) {
                    gameResult.results.forEach((result: any) => {
                      if (Array.isArray(result) && result.length >= 2 && result[0] === "Message") {
                        if (Array.isArray(result[1]) && result[1].length > 0) {
                          addNotification({
                            title: "Achievement",
                            description: result[1][0],
                            status: "success",
                          });
                          notificationShown = true;
                        }
                      }
                    });
                  }

                  // If no notification shown but game state was updated, shows a fallback notification
                  if (!notificationShown && gameResult && gameResult.game_state) {
                    addNotification({
                      title: t("playground.feedback.solutionAccepted.title"),
                      description: t("playground.feedback.solutionAccepted.description"),
                      status: "success",
                    });
                  }
                }).catch(wasmError => {
                  console.error("WASM processing error:", wasmError);
                });
              } catch (wasmError) {
                console.error("WASM processing error:", wasmError);
              }

              resolve(true);
            },
            onError: (err: string) => {
              errors.push({
                content: err,
                index: 0,
              });

              setSubmissionFeedback(err);
              setSubmissionResult(Result.RUNTIME_ERROR);
              setValidationOutputs(additionalOutputs.current);
              resolve(true);
            },
          });
        });
      } else {
        // For non-Python languages or when skulpt is disabled
        setSubmissionFeedback(t("playground.feedback.languageNotSupported"));
        setSubmissionResult(Result.WRONG_ANSWER);
        setValidationOutputs(null);
      }

      saveSubmissionDataInLocalStorage(
        submissionFeedback,
        submissionResult,
        false,
        validationOutputs
      );
    } catch (error) {
      console.error("Error during evaluation:", error);
      setSubmissionFeedback("An error occurred during evaluation");
      setSubmissionResult(Result.RUNTIME_ERROR);
    } finally {
      setWaitingForEvaluationResult(false);
    }
  };
  const validateSubmission = async () => {
    clearPlayground(true);
    setIsWasmLoading(true);
    console.log("validateSubmission");

    try {
      await loadWasmModule();
    } catch (err) {
      console.error("Failed to load WASM module:", err);
      addNotification({
        title: "Initialization Error",
        description: "Failed to load code execution environment",
        status: "error",
      });
      setIsWasmLoading(false);
      return;
    }
    setIsWasmLoading(false);

    if (!exerciseData) {
      addNotification({
        title: t("error.unknownProblem.title"),
        description: "Exercise data not available",
        status: "error",
      });
      return;
    }

    if (!exerciseData) {
      addNotification({
        title: t("error.unknownProblem.title"),
        description: "Exercise data not available",
        status: "error",
      });
      return;
    }

    if (!code) {
      addNotification({
        title: t("playground.feedback.noCode.title"),
        description: t("playground.feedback.noCode.descriptionRun"),
        status: "warning",
      });
      return;
    }

    setWaitingForValidationResult(true);
    additionalOutputs.current = [];

    try {
      const lang = activeLanguage;
      if (!lang.id) {
        throw new Error("Missing programming language ID");
      }
      const langData = exerciseData.languageData[lang.id];
      if (!langData) {
        throw new Error("Programming language data is undefined");
      }
      // Combine precode, user code, and postcode
      const fullCode = `${langData.precode}${code}${langData.postcode}`;
      console.log("activeLanguage", activeLanguage);

      if (activeLanguage.name?.substring(0, 6).toLowerCase() === "python" && isSkulptEnabled) {
        let errors: { content: string; index: number }[] = [];

        for (let i = 0; i < testValues.length; i++) {
          await new Promise((resolve) => {
            const testValue = testValues[i];
            const testValueSplitted = testValue.split("\n");
            let inputFunN = 0;

            runPython({
              moreThanOneExecution: testValues.length > 1,
              getInput: () => {
                const nextInput = testValueSplitted[inputFunN];
                inputFunN++;
                return nextInput.length === 0 ? undefined : nextInput;
              },
              code: fullCode,
              setLoading: setWaitingForValidationResult,
              setOutput: (v: string) => {
                additionalOutputs.current = [...additionalOutputs.current, v];
              },
              setResult: (v: Result) => {
                setSubmissionResult(v);
              },
              stopExecution,
              onFinish: () => { },
              onSuccess: () => {
                setValidationOutputs(additionalOutputs.current);
                setSubmissionFeedback("");
                setSubmissionResult(null);

                saveSubmissionDataInLocalStorage(
                  "",
                  null,
                  true,
                  additionalOutputs.current
                );

                resolve(true);
              },
              onError: (err: string) => {
                errors.push({
                  content: err,
                  index: i,
                });

                setSubmissionFeedback(err);
                setSubmissionResult(Result.RUNTIME_ERROR);

                saveSubmissionDataInLocalStorage(
                  err,
                  Result.RUNTIME_ERROR,
                  true,
                  null
                );

                resolve(true);
              },
            });
          });
        }

        if (testValues.length > 1 && errors.length === 0) {
          setSubmissionResult(null);
          setValidationOutputs(additionalOutputs.current);
          setSubmissionFeedback("");

          saveSubmissionDataInLocalStorage(
            "",
            null,
            true,
            additionalOutputs.current
          );
        }
      } else if (/*activeLanguage.id?.toUpperCase() === "C" ||*/ activeLanguage.id?.toUpperCase() === "CPP") {
        // JSCPP-NG for C/C++
        let errors: { content: string; index: number }[] = [];
        // fullText : string
        // setWaitingForEvaluationResult: Dispatch<SetStateAction<boolean>>
        // setSubmissionResult: (value: SetStateAction<Result | null>) => void
        // setSubmissionFeedback: (value: SetStateAction<string>) => void
        // setWaitingForEvaluationResult: (value: SetStateAction<boolean>) => void
        // setValidationOutputs: (value: string[]) => void
        // stopExecution: { current: boolean }
        // additionalOutputs: MutableRefObject<string[]>

        for (let i = 0; i < testValues.length; i++) {
          await new Promise((resolve) => {
            const testValue = testValues[i];
            const testValueSplitted = testValue.split("\n");
            let inputFunN = 0;
            runCpp({
              code: code,
              setLoading: setWaitingForEvaluationResult,
              setOutput: (v: string) => {
                additionalOutputs.current = [...additionalOutputs.current, v];
              },
              setResult: (v: Result) => {
                setSubmissionResult(v);
              },
              stopExecution,
              getInput: () => {
                return new Promise((resolve, reject) => {
                  const nextInput = testValueSplitted[inputFunN];
                  if (nextInput) {
                    inputFunN++;
                    resolve(nextInput);
                  } else {
                    reject();
                  }
                });
              },
              addFile: () => { throw new Error("addFile: Not yet implemented"); },
              onFinish: () => {
                setValidationOutputs(additionalOutputs.current);
                setSubmissionFeedback("");
                setSubmissionResult(null);

                saveSubmissionDataInLocalStorage(
                  "",
                  null,
                  true,
                  additionalOutputs.current
                );
              },
              onSuccess: () => {
                resolve(true);
              },
              onError: (err: string) => {
                errors.push({
                  content: err,
                  index: i,
                });

                setSubmissionFeedback(err);
                setSubmissionResult(Result.RUNTIME_ERROR);

                saveSubmissionDataInLocalStorage(
                  err,
                  Result.RUNTIME_ERROR,
                  true,
                  null
                );

                resolve(true);
              },
            });
          });
        }
      } else {
        // For non-Python languages or when Skulpt is disabled
        setSubmissionFeedback(t("playground.feedback.languageNotSupported"));
        setSubmissionResult(Result.WRONG_ANSWER);
        setValidationOutputs(null);
      }
    } catch (error) {
      console.error("Error during validation:", error);
      setSubmissionFeedback("An error occurred during execution");
      setSubmissionResult(Result.RUNTIME_ERROR);
    } finally {
      setWaitingForValidationResult(false);
    }
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

  const restoreLatestSubmissionOrValidation = () => {
    getAndSetLatestStateFromLocalStorageOrClear();
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
      <Box width={"100%"} height={"100%"} m={0} p={0}>
        <Box position="relative">
          <Skeleton isLoaded={!isLoading && !isExerciseDataLoading}>
            <Statement
              activity={activity}
              gameId={gameId}
              exerciseData={exerciseData}
            />
          </Skeleton>

          <Hints challengeId={challengeId} gameId={gameId} hints={hints} />
        </Box>
        <EditorMenu
          setStopExecution={(v: boolean) => {
            stopExecution.current = v;
          }}
          gameId={gameId}
          setSideMenuOpen={setSideMenuOpen}
          editorKind={activity?.editorKind}
          reload={reloadCode}
          submissionResult={submissionResult}
          activeLanguage={activeLanguage}
          setActiveLanguage={(l) => {
            setCode(null);
            setActiveLanguage(l);
          }}
          evaluateSubmission={evaluateSubmission}
          validateSubmission={validateSubmission}
          isValidationFetching={isWaitingForValidationResult}
          isEvaluationFetching={isWaitingForEvaluationResult}
          restore={restoreLatestSubmissionOrValidation}
          setSubmissionFetching={setWaitingForEvaluationResult}
          programmingLanguages={programmingLanguages}
          setValidationFetching={setWaitingForValidationResult}
          testValues={testValues}
          setTestValues={setTestValues}
          solved={solved}
          setNextUnsolvedExercise={setNextUnsolvedExercise}
          connectionError={connectionProblem}
          isRestoreAvailable={true}
        />

        <Skeleton
          height={`calc(100% - ${getStatementHeight(activity, exerciseData) + 50}px)`}
          minHeight={500}
          flexDirection={{ base: "column", md: "row" }}
          as={Flex}
          isLoaded={!isLoading && !isExerciseDataLoading}
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

export default Exercise;
