import { Box, Button, Flex, Text, Link } from "@chakra-ui/react";
import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";
import withChangeAnimation from "../utilities/withChangeAnimation";
import ErasmusLogo from "../images/erasmus.png";
import LogoSVG from "../images/logo.svg";

import { useKeycloak } from "../auth/keycloak-compat";

const HomePage = () => {
  const { t } = useTranslation(["translation", "tos"]);
  const { keycloak, initialized } = useKeycloak();

  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      textAlign="center"
      padding={25}
      maxWidth={800}
      margin="auto"
    >
      <Box>
        {/* <h3>{t("home.title")}</h3>
        <p>{t("home.description")}</p> */}
        <Box
          // maxWidth={700}
          textAlign="justify"
          marginTop={15}
          marginBottom={25}
        >
          <Text fontSize="xl">{t("home.welcome")}</Text>
        </Box>
        <Link
          onClick={() => {
            keycloak.login({
              redirectUri: `${window.location.origin}${process.env.PUBLIC_URL}/profile`,
            });
          }}
          fontWeight={500}
          marginTop={25}
          marginBottom={25}
          data-cy="homepage-login-link"
        >
          {t("home.clickToLogin")}
        </Link>
        <Link
          onClick={() => {
            keycloak.login({
              redirectUri: `${window.location.origin}${process.env.PUBLIC_URL}/profile`,
            });
          }}
        >
          <FGPELogo src={LogoSVG} />
        </Link>

        <ErasmusImage />
        <Erasmus>
          The contents of this website are the sole responsibility of the
          authors and can in no way be taken to reflect the views of the
          European Union or the Erasmus+ programme.
        </Erasmus>
        {/* <hr style={{ margin: "8px 0px" }} />
        <LinkStyled href="https://fgpe.usz.edu.pl/">
          <span>
            Framework for Gamified Programming Education (Erasmus+ Programme)
          </span>
        </LinkStyled> */}
      </Box>
    </Flex>
  );
};

const FGPELogo = styled.img`
  width: 100%;
  margin: auto;

  margin-top: 50px;
  max-width: 600px;
  transition: transform 0.5s;

  &:hover {
    transform: scale(1.03);
  }
`;

const LinkStyled = styled.a`
  font-size: 14px;
  color: #49b3e0;
  transition: color 0.5s;
  width: 100%;
  /* display: flex;
  justify-content: center;
  align-items: center; */
  text-align: center;
  &:hover {
    color: #00b3ff;
  }
`;

const ErasmusImage = styled.div`
  width: 100%;
  height: 100px;
  background-color: white;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  background-image: url(${ErasmusLogo});
  border-radius: 8px;
  margin-bottom: 16px;
  margin-top: 80px;
`;

const Erasmus = styled.div`
  max-width: 500px;
  padding: 4px 0px;
  margin: auto;
  /* margin: 4px 0px; */
  font-size: 14px;
  text-align: justify;
`;

export default withChangeAnimation(HomePage);
