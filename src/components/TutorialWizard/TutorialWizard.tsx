import { Button, Flex, useColorMode } from "@chakra-ui/react";
import styled from "@emotion/styled";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";

const TUTORIALS_PORTAL = document.getElementById("tutorial");

interface TutorialStep {
  ref?: { current: HTMLElement | null };
  content: string;
  canGoNext?: boolean;
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
  textAlign?: "left" | "right" | "center";
  menuOnTop?: boolean;
}

const TutorialWizard = ({
  steps,
  isTutorialWizardOpen,
  setTutorialWizardOpen,
  top,
}: {
  steps: TutorialStep[];
  isTutorialWizardOpen: boolean;
  setTutorialWizardOpen: (v: boolean) => void;
  top?: boolean;
}) => {
  const { t } = useTranslation();

  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const canGoNext = useMemo(() => {
    return tutorialSteps.length < 1
      ? false
      : typeof tutorialSteps[activeStepIndex].canGoNext !== "undefined"
      ? tutorialSteps[activeStepIndex].canGoNext
      : true;
  }, [activeStepIndex, tutorialSteps]);

  const activeStep = useMemo(() => {
    console.log(
      tutorialSteps,
      tutorialSteps.find((_x, i) => i === activeStepIndex)
    );
    return tutorialSteps.find((_x, i) => i === activeStepIndex);
  }, [activeStepIndex, tutorialSteps]);
  const stepClassName: string = `step-${activeStepIndex}`;

  useEffect(() => {
    setActiveStepIndex(0);
  }, [isTutorialWizardOpen]);

  useEffect(() => {
    setTutorialSteps(steps);

    steps.forEach((step, i) => {
      if (!step.ref) {
        return;
      }

      if (!step.ref.current) {
        return;
      }

      const stepClassName = `step-${i}`;
      if (!step.ref.current.classList.contains(stepClassName)) {
        step.ref.current.classList.add(stepClassName);
        step.ref.current.classList.add("step-animate");
      }
    });
  }, [steps]);

  if (!TUTORIALS_PORTAL) {
    console.log("No tutorials portal found");
    return <></>;
  }

  return ReactDOM.createPortal(
    isTutorialWizardOpen && (
      <AnimatePresence>
        {isTutorialWizardOpen && (
          <>
            <style>
              {activeStep &&
                activeStep.ref &&
                `
                html {
                    pointer-events:  none !important;
                }

                .step-animate:after {
                  opacity: 0;
                  transition: opacity 0.5s;
                }
    
                .${stepClassName} {
                  pointer-events: auto;
                  position: relative;
                  z-index: 9999;
                  
                }
    
                .${stepClassName}:before {
                    content: "";
                    position: absolute;
                    width: calc(100% + 16px);
                    height: calc(100% + 16px);
                    left: -8px;
                    top: -8px;
                    z-index: 1000;
                    box-shadow: 0 0 0 99999px rgba(0, 0, 0, .9), inset 0 0 10px #000;
                    pointer-events:  none;
                    border-radius: 4px;

                }
    
                .${stepClassName}:after {
                    content: '${activeStep.canGoNext ? "✅ " : ""}${CSS.escape(
                  activeStep.content
                )}';
                    margin-top: 1rem;
                    position: absolute;
                    ${
                      activeStep.right
                        ? `right: ${activeStep.right}px;`
                        : "left: 0;"
                    }

                    ${
                      top
                        ? `top: ${
                            (activeStep.ref.current?.offsetHeight || 40) + 2
                          }px;`
                        : ""
                    }

                    ${
                      activeStep.top && !activeStep.bottom
                        ? `top: ${activeStep.top}px;`
                        : ""
                    }
                    ${
                      activeStep.bottom && !activeStep.top
                        ? `bottom: ${activeStep.top}px;`
                        : ""
                    }
                    ${activeStep.left ? `left: ${activeStep.top}px;` : ""}
                    
                    width: 100%;
                    min-width: 200px;
                    max-width: 500px;
                    z-index: 1052;
                    color: #fff;
                    white-space: pre-wrap;
                    font-size: 15px;
                    line-height: 1.2em;
                    text-align: ${activeStep.textAlign || "left"};
                    animation: fadeIn 0.5s; 
                    animation-fill-mode: forwards;
                }
                
                @keyframes fadeIn {
                  0% { opacity: 0; }
                  100% { opacity: 1; }
                }

                `}
            </style>
            <TutorialBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              menuOnTop={activeStep?.menuOnTop || false}
            >
              {!activeStep?.ref && (
                <CenterText>
                  <p>{activeStep?.content}</p>
                </CenterText>
              )}
              <Flex className="tutorial-buttons">
                <Button
                  color={"white"}
                  variant="outline"
                  colorScheme="gray"
                  onClick={() => setTutorialWizardOpen(false)}
                >
                  {t("Close")}
                </Button>
                <Flex style={{ gap: 4 }}>
                  <Button
                    disabled={activeStepIndex <= 0}
                    onClick={() => setActiveStepIndex(activeStepIndex - 1)}
                  >
                    {t("Back")}
                  </Button>
                  <Button
                    disabled={
                      !canGoNext || activeStepIndex >= tutorialSteps.length - 1
                    }
                    onClick={() => setActiveStepIndex(activeStepIndex + 1)}
                  >
                    {t("playground.menu.next")}
                  </Button>
                </Flex>
              </Flex>
            </TutorialBox>
          </>
        )}
      </AnimatePresence>
    ),
    TUTORIALS_PORTAL
  );
};

const CenterText = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.9);

  & > p {
    max-width: 400px;
    padding: 20px;
    text-align: justify;
    white-space: break-spaces;
  }
`;

// Add props menuOnTop
const TutorialBox = styled(motion.div)<{ menuOnTop?: boolean }>`
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  pointer-events: all;

  .tutorial-buttons {
    position: fixed;
    z-index: 99999;
    gap: 8px;
    width: 100%;
    justify-content: space-between;
    padding: 16px;
    bottom: 0px;
    top: calc(100% - 74px);
    ${({ menuOnTop }) => (menuOnTop ? "top: calc(0% - 0px);" : "")}
    transition: top 0.5s;
    height: 74px;
  }

  .menu-on-top {
    color: red !important;
  }
`;

export default TutorialWizard;
