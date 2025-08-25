import { ArrowBackIcon } from "@chakra-ui/icons";
import { Box, VStack, Flex } from "@chakra-ui/layout";
import { Heading, Button } from "@chakra-ui/react";
import { useKeycloak } from "../../auth/keycloak-compat";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import withChangeAnimation from "../../utilities/withChangeAnimation";
import { useNotifications } from "../Notifications";
import ChangeAvatarURL from "./ChangeAvatarURL";
import Editable from "./Editable";
import PasswordChangeForm from "./PasswordChangeForm";

const AccountSettings = () => {
  const { add: addNotification } = useNotifications();

  const history = useHistory();
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();
  const [userProfile, setUserProfile] = useState<any>({});

  const loadUserProfile = useCallback(async () => {
    const keycloakUserProfile = await keycloak.loadUserProfile();
    if (keycloakUserProfile) {
      setUserProfile(keycloakUserProfile);
    }

    axios.defaults.headers.post["Authorization"] = `Bearer ${keycloak.token}`;
  }, [keycloak]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  if (!userProfile.email) {
    return <span>{t("Loading")}</span>;
  }

  const changePassword = async ({
    currentPassword,
    newPassword,
    confirmation,
  }: {
    currentPassword: string;
    newPassword: string;
    confirmation: string;
  }) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_KEYCLOAK_URL}/realms/${keycloak.realm}/account/credentials/password`,
        {
          currentPassword,
          newPassword,
          confirmation,
        }
      );

      console.log("success");
    } catch (err) {
      addNotification({
        status: "error",
        title: t("error.passwordChange.title"),
        description: t("error.passwordChange.description"),
      });
      console.log(err);
    }
  };

  const editUserDetails = async ({
    firstName,
    lastName,
  }: {
    firstName?: String;
    lastName?: String;
  }) => {
    await axios.post(
      `${process.env.REACT_APP_KEYCLOAK_URL}/realms/${keycloak.realm}/account/`,
      {
        firstName: firstName ? firstName : userProfile.firstName,
        lastName: lastName ? lastName : userProfile.lastName,
      }
    );
  };

  // const changeAvatar = async ({ avatarDataURL }: { avatarDataURL: string }) => {
  //   const params = {
  //     [process.env.REACT_APP_KEYCLOAK_AVATAR || "avatar"]: avatarDataURL,
  //   };

  //   try {
  //     await axios.post(
  //       `${process.env.REACT_APP_KEYCLOAK_URL}/realms/${keycloak.realm}/account/`,
  //       {
  //         firstName: userProfile.firstName,
  //         lastName: userProfile.lastName,
  //         attributes: {
  //           ...params,
  //         },
  //       }
  //     );
  //   } catch (err) {
  //     addNotification({
  //       status: "error",
  //       title: t("error.title"),
  //       description: t("error.description"),
  //     });
  //   }
  // };

  const changeAvatarURL = async ({ avatarURL }: { avatarURL: string }) => {
    const params = {
      [process.env.REACT_APP_KEYCLOAK_AVATAR || "avatar"]: avatarURL,
    };

    try {
      await axios.post(
        `${process.env.REACT_APP_KEYCLOAK_URL}/realms/${keycloak.realm}/account/`,
        {
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          attributes: {
            ...params,
          },
        }
      );

      loadUserProfile();
    } catch (err) {
      addNotification({
        status: "error",
        title: t("error.title"),
        description: t("error.description"),
      });
    }
  };

  return (
    <Box maxWidth={500} margin="auto">
      {/* Header withh return button */}
      <Flex width="100%" justifyContent="space-between" alignItems="center" marginTop={5} marginBottom={5}>
        <Button
          variant="outline"
          leftIcon={<ArrowBackIcon />}
          onClick={() => history.push("/profile")}
        >
          {t("Back")}
        </Button>
        
        <Heading as="h3" size="md" textAlign="center">
          {t("Account settings")}
        </Heading>
        
        { }
        <Box width="80px" />
      </Flex>

      <VStack spacing={3}>
        <Editable
          defaultValue={userProfile.firstName}
          label={t("First name")}
          onChange={async (value) => {
            await editUserDetails({ firstName: value });
            setUserProfile({ ...userProfile, lastName: value });
          }}
        />
        <Editable
          defaultValue={userProfile.lastName}
          label={t("Last name")}
          onChange={async (value) => {
            await editUserDetails({ lastName: value });
            setUserProfile({ ...userProfile, lastName: value });
          }}
        />

        {/* <ChangeAvatar
          changeAvatar={changeAvatar}
          avatarDataURL={userProfile[process.env.REACT_APP_KEYCLOAK_AVATAR]}
          loadUserProfile={loadUserProfile}
        /> */}

        <ChangeAvatarURL
          changeAvatar={changeAvatarURL}
          avatarURL={
            userProfile.attributes[process.env.REACT_APP_KEYCLOAK_AVATAR] &&
            userProfile.attributes[process.env.REACT_APP_KEYCLOAK_AVATAR][0]
          }
        />

        <PasswordChangeForm onSubmit={changePassword} />
      </VStack>
    </Box>
  );
};

export default withChangeAnimation(AccountSettings);