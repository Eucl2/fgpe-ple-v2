import { CircularProgress, Text, VStack } from "@chakra-ui/react";
import styled from "@emotion/styled";
import React, { useState, useEffect } from "react";

interface MainLoadingProps {
  message?: string;
  showDots?: boolean;
}

const MainLoading: React.FC<MainLoadingProps> = ({ 
  message = "Loading", 
  showDots = true 
}) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!showDots) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [showDots]);

  return (
    <Fullscreen>
      <VStack spacing={3}>
        <CircularProgress isIndeterminate color="blue.300" />
        <Text fontSize="md" color="gray.600">
          {message}{showDots ? dots : ""}
        </Text>
      </VStack>
    </Fullscreen>
  );
};

const Fullscreen = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export default MainLoading;
