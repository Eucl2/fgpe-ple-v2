import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
  } from "@chakra-ui/react";
  import React from "react";
  import { useTranslation } from "react-i18next";
  
  const LogoutModal = ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) => {
    const { t } = useTranslation();
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xs">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("Logout")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {t("Are you sure you want to logout?")}
          </ModalBody>
  
          <ModalFooter justifyContent="space-between">
            <Button variant="ghost" colorScheme="blue" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button colorScheme="red" onClick={onConfirm}>
              {t("Logout")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };
  
  export default LogoutModal;
  