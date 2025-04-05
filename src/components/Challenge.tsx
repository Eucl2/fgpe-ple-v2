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
import { motion } from "framer-motion";
import { useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { FocusActivityContextType } from "../@types/focus-activity";
import { FocusActivityContext } from "../context/FocusActivityContext";
import withChangeAnimation from "../utilities/withChangeAnimation";
import BreadcrumbComponent from "./BreadcrumbComponent";
import Exercise from "./Exercise";
import ScrollbarWrapper from "./ScrollbarWrapper";

interface ParamTypes {
    gameId: string;
    challengeId: string;
    exerciseId?: string;
}

interface ExerciseDataType {
    order: number;
    title: string;
    description: string;
    initcode: string;
    precode: string;
    postcode: string;
    checksource: string;
    testcode: string;
    hidden: boolean;
    locked: boolean;
    mode: string;
    modeParameters: {};
    difficulty: string;
}

// Simplified version of getActivityById_activity
interface getActivityById_activity {
    __typename: "Activity";
    id: string;
    name: string;
    description: string;
    initcode: string;
    precode: string;
    postcode: string;
    checksource: string;
    testcode: string;
    hidden: boolean;
    locked: boolean;
    mode: string;
    modeParameters: {};
    difficulty: string;
    pdf: boolean | null;
    statement: string;
    editorKind: string;
    title: string;
    codeSkeletons: string[];
}

const Challenge = () => {
    const mockExercises: ExerciseDataType[] = [
        {
            order: 1,
            title: "My First Exercise",
            description: "Learn the basics of coding.",
            initcode: "print('Hello, world!')",
            precode: "",
            postcode: "",
            checksource: "",
            testcode: "",
            hidden: false,
            locked: false,
            mode: "",
            modeParameters: {},
            difficulty: "easy",
        },
        {
            order: 2,
            title: "More Coding Fun",
            description: "Practice your skills.",
            initcode: "print('Coding is fun!')",
            precode: "",
            postcode: "",
            checksource: "",
            testcode: "",
            hidden: false,
            locked: false,
            mode: "",
            modeParameters: {},
            difficulty: "medium",
        },
    ];

    const [showExerciseNumbers, setShowExerciseNumbers] = useState(false);
    const { gameId, challengeId, exerciseId } = useParams<ParamTypes>();
    const { t } = useTranslation();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const { colorMode } = useColorMode();
    const { focusActivity } = useContext(FocusActivityContext) as FocusActivityContextType;
    const [activeExercise, setActiveExercise] = useState<ExerciseDataType | null>(null);

    useEffect(() => {
        if (mockExercises.length > 0) {
            setActiveExercise(mockExercises[0]);
        }
    }, []);

    if (!gameId || !challengeId) {
        return <div>Game ID or Challenge ID not provided</div>;
    }

    const convertExerciseData = (exercise: ExerciseDataType): getActivityById_activity => {
        return {
            __typename: "Activity",
            id: String(exercise.order),
            name: exercise.title,
            description: exercise.description,
            initcode: exercise.initcode,
            precode: exercise.precode,
            postcode: exercise.postcode,
            checksource: exercise.checksource,
            testcode: exercise.testcode,
            hidden: exercise.hidden,
            locked: exercise.locked,
            mode: exercise.mode,
            modeParameters: exercise.modeParameters,
            difficulty: exercise.difficulty,
            pdf: null,
            statement: exercise.description,
            editorKind: "code",
            title: exercise.title,
            codeSkeletons: [],
        };
  };

    return (
        <Playground>
            {!focusActivity && activeExercise && (
                <BreadcrumbComponent
                    gameName={"Version 0.1 game"}
                    gameId={gameId}
                    challengeName={"Version 0.1 challenge"}
                    challengeId={challengeId}
                    isChallengeActive={true}
                />
            )}
            <MotionBox
                animate={{ opacity: sideMenuOpen ? 1 : 0 }}
                pointerEvents={sideMenuOpen ? "all" : "none"}
                left={0}
                top={0}
                position="fixed"
                zIndex={998}
                height="100%"
                width="100%"
                backgroundColor="rgba(0,0,0,0.5)"
                onClick={() => { setSideMenuOpen(false); }}
            />
            <ScrollbarWrapper>
                <Flex h="100%" w="100%">
                    <MotionBox
                        position={{ base: "fixed", md: "relative" }}
                        top={{ base: 0, md: "auto" }}
                        background={{ base: colorMode !== "dark" ? "gray.200" : "gray.900", md: "none" }}
                        zIndex={999}
                        left={{ md: "0 !important" }}
                        animate={{ left: sideMenuOpen ? "0%" : "-50%" }}
                        width={{ base: "50%", md: 2 / 12 }}
                        maxWidth={{ base: "100%", md: 330 }}
                        height="100%"
                        overflowY="scroll"
                        borderRight="1px solid rgba(0,0,0,0.1)"
                        className="better-scrollbar"
                    >
                        <Box position="absolute" left={"calc(100% + 20px)"} display={{ base: "block", md: "none" }} opacity={sideMenuOpen ? 1 : 0} pointerEvents={sideMenuOpen ? "all" : "none"}>
                            <IconButton colorScheme="blue" height="50px" width="30px" position="fixed" size="xl" zIndex={2000} top="50%" transform="translate(-50%, -50%)" aria-label="Open / Close" icon={sideMenuOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />} onClick={() => setSideMenuOpen(!sideMenuOpen)} />
                        </Box>
                        <Box p={{ base: 1, md: 5 }} h="100%" w="100%" position="relative">
                            <Flex flexDirection="column" alignItems="center" w="100%" overflowY="hidden" data-cy="exercises-list">
                                {mockExercises.map((exercise, i) => (
                                    <Button
                                        marginBottom={2}
                                        w="100%"
                                        size="sm"
                                        fontSize={12}
                                        key={i}
                                        colorScheme={exercise.title === activeExercise?.title ? "blue" : "gray"}
                                        className={"exercise " + (exercise.title === activeExercise?.title ? "active" : "")}
                                        onClick={() => setActiveExercise(exercise)}
                                        data-cy="exercise-button"
                                    >
                                        <Text whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                                            {showExerciseNumbers ? `${i + 1}. ${exercise.title}` : exercise.title}
                                        </Text>
                                    </Button>
                                ))}
                            </Flex>
                        </Box>
                    </MotionBox>
                    {activeExercise && (
                        <Exercise
                            setSideMenuOpen={() => { setSideMenuOpen(true); }}
                            gameId={gameId}
                            challengeId={challengeId}
                            activity={convertExerciseData(activeExercise)}
                            programmingLanguages={["python"]}
                            challengeRefetch={() => { }}
                            solved={false}
                            setNextUnsolvedExercise={() => { }}
                            hints={[]}
                            isLoading={false}
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