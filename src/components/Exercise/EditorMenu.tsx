import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SettingsIcon,
} from "@chakra-ui/icons";
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Center,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Tooltip,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { BiLink, BiUnlink } from "react-icons/bi";
import { BsLayoutSidebarInset } from "react-icons/bs";
import { IoExitOutline } from "react-icons/io5";
import { FindChallenge_programmingLanguages } from "../../generated/FindChallenge";
import { Result } from "../../generated/globalTypes";
import { setDefaultProgrammingLanguage } from "./helpers/defaultProgrammingLanguage";
import { getColorSchemeForSubmissionResult } from "./helpers/EditorMenu";
import isFullMenuAvailable from "./helpers/isFullMenuAvailable";
import Settings from "./Settings";
// import { useHotkeys } from "react-hotkeys-hook";
import TextareaModal from "./TextareaModal";

const EditorMenu = ({
  submissionResult,
  activeLanguage,
  evaluateSubmission,
  validateSubmission,
  isEvaluationFetching: isWaitingForEvaluationResult,
  setSideMenuOpen,
  setSubmissionFetching: setIsWaitingForEvaluationResult,
  setActiveLanguage,
  programmingLanguages,
  isValidationFetching: isWaitingForValidationResult,
  setValidationFetching: setIsWaitingForValidationResult,
  testValues,
  setTestValues,
  solved,
  setNextUnsolvedExercise,
  connectionError,
  restore,
  isRestoreAvailable,
  reload,
  editorKind,
  gameId,
  setStopExecution,
}: {
  setSideMenuOpen: () => void;
  editorKind: string | undefined | null;
  submissionResult: string | null;
  activeLanguage: FindChallenge_programmingLanguages;
  evaluateSubmission: (isSpotBug?: boolean) => void;
  validateSubmission: () => void;
  isEvaluationFetching: boolean;
  setSubmissionFetching: React.Dispatch<React.SetStateAction<boolean>>;
  setValidationFetching: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveLanguage: React.Dispatch<
    React.SetStateAction<FindChallenge_programmingLanguages>
  >;
  programmingLanguages: FindChallenge_programmingLanguages[];
  isValidationFetching: boolean;
  testValues: string[];
  setTestValues: React.Dispatch<React.SetStateAction<string[]>>;
  solved: boolean;
  setNextUnsolvedExercise: () => void;
  connectionError: any;
  restore: () => void;
  reload: () => void;
  isRestoreAvailable: boolean;
  gameId: string;
  setStopExecution: (v: boolean) => void;
}) => {
  const { t } = useTranslation();

  const {
    isOpen: isSettingsOpen,
    onOpen: openSettings,
    onClose: closeSettings,
  } = useDisclosure();

  const {
    isOpen: isTextareaModalOpen,
    onOpen: openTextareaModal,
    onClose: closeTextareaModal,
  } = useDisclosure();

  const { colorMode } = useColorMode();
  // useHotkeys("ctrl+\\", evaluateSubmission);

  return (
    <>
      <Settings
        isOpen={isSettingsOpen}
        onOpen={openSettings}
        onClose={closeSettings}
      />
      <TextareaModal
        isOpen={isTextareaModalOpen}
        onClose={closeTextareaModal}
        testValues={testValues}
        setTestValues={setTestValues}
      />
      <Flex
        height={{ base: 144, md: 50 }}
        minHeight={50}
        backgroundColor={colorMode === "dark" ? "#1c232f" : "gray.50"}
        alignItems="center"
        justifyContent="center"
        p={2}
        flexDirection={{ base: "column", md: "row" }}
        data-cy="editor-menu"
      >
        <Box
          width={{ base: "100%", md: 7 / 12 }}
          height={{ base: "50%", md: "auto" }}
          marginBottom={{ base: 4, md: 0 }}
        >
          <Flex
            width={"100%"}
            height="100%"
            flexDir={{ base: "column", md: "row" }}
            justifyContent="center"
            alignItems="center"
          >
            <Flex
              width={{ base: "100%", md: "70%", lg: "70%" }}
              marginRight={0.5}
              marginBottom={{ base: 2, md: 0 }}
            >
              <Center width={1 / 3}>
                <Menu>
                  {({ isOpen }) => (
                    <>
                      <MenuButton
                        size="sm"
                        isActive={isOpen}
                        as={Button}
                        w="95%"
                        rightIcon={<ChevronDownIcon />}
                        fontSize={12}
                        data-cy="active-language-dropdown"
                      >
                        {activeLanguage.name}
                      </MenuButton>
                      <MenuList>
                        {programmingLanguages.map((language, i) => (
                          <MenuItem
                            key={i}
                            onClick={() => {
                              setDefaultProgrammingLanguage(language, gameId);
                              setActiveLanguage(language);
                            }}
                            data-cy="active-language-item"
                          >
                            {language.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </>
                  )}
                </Menu>
              </Center>

              {isFullMenuAvailable(editorKind) && (
                <Center width={1 / 3}>
                  <ButtonGroup size="sm" isAttached w="95%" colorScheme="blue">
                    <Button
                      data-cy="run"
                      onClick={() => {
                        if (isWaitingForValidationResult) {
                          console.log("stopping...");
                          setStopExecution(true);
                          setIsWaitingForValidationResult(false);
                        } else {
                          setStopExecution(false);
                          validateSubmission();
                        }
                      }}
                      w="95%"
                      isLoading={isWaitingForValidationResult}
                      loadingText={
                        activeLanguage.name === "Python 3" ? "Stop" : undefined
                      }
                      disabled={
                        (isWaitingForEvaluationResult ||
                          isWaitingForValidationResult) &&
                        activeLanguage.name !== "Python 3"
                      }
                      fontSize={{ base: 12, lg: 14 }}
                      whiteSpace="normal"
                    >
                      {t("playground.menu.run")}
                    </Button>
                    <Tooltip
                      label={t("playground.menu.addTestValues")}
                      aria-label="A tooltip"
                      bg="gray.300"
                      color="black"
                      hasArrow
                      openDelay={500}
                      visibility={isTextareaModalOpen ? "hidden" : "initial"}
                    >
                      <IconButton
                        data-cy="test-values"
                        color={colorMode === "dark" ? "black" : "white"}
                        bgColor={colorMode === "dark" ? "gray.500" : "gray.800"}
                        onClick={openTextareaModal}
                        aria-label="Open"
                        icon={<IoExitOutline fontSize={18} />}
                        disabled={
                          isWaitingForEvaluationResult ||
                          isWaitingForValidationResult
                        }
                      />
                    </Tooltip>
                  </ButtonGroup>
                </Center>
              )}

              <Center width={1 / 3}>
                <Button
                  data-cy="submit"
                  colorScheme="blue"
                  onClick={() => {
                    if (isWaitingForEvaluationResult) {
                      setIsWaitingForEvaluationResult(false);
                    } else {
                      if (editorKind === "SPOT_BUG") {
                        evaluateSubmission(true);
                      } else {
                        evaluateSubmission();
                      }
                    }
                  }}
                  w="95%"
                  size="sm"
                  isLoading={isWaitingForEvaluationResult}
                  // loadingText={"Stop"}
                  disabled={
                    isWaitingForEvaluationResult || isWaitingForValidationResult
                  }
                  fontSize={{ base: 12, lg: 14 }}
                  whiteSpace="normal"
                >
                  {t("playground.menu.submit")}
                </Button>
              </Center>
            </Flex>

            <Flex
              width={{ base: "100%", md: "30%", lg: "20%" }}
              justifyContent={{ base: "center", md: "initial" }}
              marginRight={4}
            >
              <Center width={1 / 3} display={{ md: "none" }} marginLeft={3}>
                <IconButton
                  data-cy="settings"
                  onClick={setSideMenuOpen}
                  size="lg"
                  w="95%"
                  height="100%"
                  aria-label="Settings"
                  icon={
                    <Flex justifyContent="center" alignItems="center">
                      <BsLayoutSidebarInset />
                      <ChevronRightIcon h={6} w={6} />
                    </Flex>
                  }
                  variant="outline"
                />
              </Center>
              {isFullMenuAvailable(editorKind) && (
                <Center w="100%">
                  <Menu>
                    {({ isOpen }) => (
                      <>
                        <MenuButton
                          data-cy="actions-dropdown"
                          colorScheme="teal"
                          size="sm"
                          isActive={isOpen}
                          as={Button}
                          w="95%"
                          rightIcon={<ChevronDownIcon />}
                          fontSize={12}
                        >
                          {t("Actions")}
                        </MenuButton>
                        <MenuList>
                          <MenuItem onClick={reload} data-cy="reload">
                            {t("playground.menu.reload")}
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              if (isRestoreAvailable) {
                                restore();
                              }
                            }}
                            isDisabled={!isRestoreAvailable}
                            cursor={
                              isRestoreAvailable ? "pointer" : "not-allowed"
                            }
                            data-cy="restore"
                          >
                            {t("playground.menu.restore")}
                          </MenuItem>
                        </MenuList>
                      </>
                    )}
                  </Menu>
                </Center>
              )}
              {/* {isFullMenuAvailable(editorKind) && (
                <>
                  <Center
                    width={{ base: 1 / 4 + 1 / 8 / 3, md: (1 / 3) * 1.2 }}
                  >
                    <Button
                      colorScheme="teal"
                      size="sm"
                      w="95%"
                      fontSize={{ base: 12, lg: 14 }}
                      onClick={reload}
                    >
                      {t("playground.menu.reload")}
                    </Button>
                  </Center>
                  <Center
                    width={{ base: 1 / 4 + 1 / 8 / 3, md: (1 / 3) * 1.2 }}
                  >
                    <Button
                      colorScheme="teal"
                      size="sm"
                      w="95%"
                      fontSize={{ base: 12, lg: 14 }}
                      onClick={restore}
                      disabled={!isRestoreAvailable}
                    >
                      {t("playground.menu.restore")}
                    </Button>
                  </Center>
                </>
              )} */}

              <Center
                width={{ base: 1 / 4 + 1 / 8 / 3, md: 1 / 3 }}
                marginLeft={1}
              >
                <IconButton
                  onClick={openSettings}
                  size="sm"
                  w="95%"
                  aria-label="Settings"
                  icon={<SettingsIcon />}
                  variant="outline"
                />
              </Center>
            </Flex>
          </Flex>
        </Box>
        <Center
          width={{ base: "100%", md: 5 / 12 }}
          height={{ base: "50%", md: "auto" }}
          borderTop={{ base: "1px solid rgba(0,0,0,0.1)", md: "none" }}
          marginTop={{ base: 1, md: "0" }}
          paddingTop={{ base: 2, md: "0" }}
        >
          <Flex w="100%" alignItems="center" justifyContent="center">
            <Box width={3 / 4} textAlign="left">
              {t("playground.menu.status.status")}:
              {submissionResult ? (
                ['COMPILATION_ERROR', 'RUNTIME_ERROR', 'ACCEPT'].includes(submissionResult) ? (
                  <Tooltip
                    label={t(`playground.menu.status.tooltip.${submissionResult}`)}
                    aria-label="Status tooltip"
                    bg="gray.300"
                    color="black"
                    hasArrow
                    openDelay={500}
                  >
                    <Badge
                      m={1}
                      colorScheme={getColorSchemeForSubmissionResult(submissionResult)}
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      maxW="calc(100% - 100px)"
                      data-cy="status"
                    >
                      {connectionError
                        ? t("playground.menu.status.CONNECTION_PROBLEM")
                        : t(`playground.menu.status.${submissionResult}`)}
                    </Badge>
                  </Tooltip>
                ) : (
                  <Badge
                    m={1}
                    colorScheme={getColorSchemeForSubmissionResult(submissionResult)}
                    textOverflow="ellipsis"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    maxW="calc(100% - 100px)"
                    data-cy="status"
                  >
                    {connectionError
                      ? t("playground.menu.status.CONNECTION_PROBLEM")
                      : t(`playground.menu.status.${submissionResult}`)}
                  </Badge>
                )
              ) : isWaitingForValidationResult ||
                isWaitingForEvaluationResult ? (
                <Spinner
                  marginRight={3}
                  marginLeft={3}
                  size="xs"
                  data-cy="loading"
                />
              ) : (
                <Badge
                  m={1}
                  colorScheme={connectionError ? "red" : "green"}
                  data-cy="status"
                >
                  {connectionError
                    ? t("playground.menu.status.CONNECTION_PROBLEM")
                    : t("playground.menu.status.READY")}
                </Badge>
              )}
              <Tooltip
                label={
                  connectionError
                    ? t("playground.menu.connection.error")
                    : t("playground.menu.connection.success")
                }
                aria-label="A tooltip"
                bg="gray.300"
                color="black"
                hasArrow
              >
                <Badge
                  colorScheme={connectionError ? "red" : "green"}
                  variant="solid"
                  data-cy="status-icon"
                >
                  {connectionError ? (
                    <BiUnlink fontSize={18} />
                  ) : (
                    <BiLink fontSize={18} />
                  )}
                </Badge>
              </Tooltip>
            </Box>
            <Box width={1 / 4} alignItems="center" justifyContent="center">
              <Tooltip
                label={t("playground.menu.nextTooltip")}
                aria-label="Next exercise tooltip"
                bg="gray.300"
                color="black"
                hasArrow
                openDelay={500}
              >
                <Button
                  colorScheme={solved ? "green" : "gray"}
                  size="sm"
                  w="95%"
                  fontSize={{ base: 12, lg: 14 }}
                  onClick={setNextUnsolvedExercise}
                  data-cy="next"
                >
                  {t("playground.menu.next")}
                </Button>
              </Tooltip>
            </Box>
          </Flex>
        </Center>
      </Flex>
    </>
  );
};

export default EditorMenu;
