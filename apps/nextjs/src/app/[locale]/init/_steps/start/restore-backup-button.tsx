"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Modal, Stack, Stepper } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconDatabaseImport } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { BackupFileDropzone } from "../../../manage/tools/backups/_components/backup-file-dropzone";
import { BackupValidationSummary } from "../../../manage/tools/backups/_components/backup-validation-summary";
import { useBackupFileValidation } from "../../../manage/tools/backups/_hooks/use-backup-file-validation";

interface RestoreBackupButtonProps {
  children: React.ReactNode;
}

export const RestoreBackupButton = ({ children }: RestoreBackupButtonProps) => {
  const t = useScopedI18n("init.step.start.restore");
  const tBackup = useScopedI18n("backup");
  const [opened, { open, close }] = useDisclosure(false);
  const [step, setStep] = useState(0);

  const validateMutation = clientApi.backup.validateOnboarding.useMutation();
  const { mutate: restore, isPending: restorePending } = clientApi.backup.restoreOnboarding.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });

      // Hard redirect to login after successful restore
      // Using window.location for full page reload since server state changed
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 1500);
    },
    onError: () => {
      showErrorNotification({
        title: tBackup("action.restore.error.title"),
        message: tBackup("action.restore.error.message"),
      });
    },
  });

  const {
    fileContent,
    validation,
    isPending: validatePending,
    handleFileDrop,
    reset,
  } = useBackupFileValidation({
    validateMutation,
  });

  // Auto-advance to validation step when validation completes successfully
  useEffect(() => {
    if (step === 0 && validation) {
      setStep(1);
    }
  }, [step, validation]);

  const handleClose = useCallback(() => {
    close();
    setStep(0);
    reset();
  }, [close, reset]);

  const handleRestore = useCallback(() => {
    if (!fileContent) return;

    restore({
      fileContent,
    });
  }, [fileContent, restore]);

  return (
    <>
      <Button onClick={open} variant="default" leftSection={<IconDatabaseImport size={16} stroke={1.5} />}>
        {children}
      </Button>

      <Modal opened={opened} onClose={handleClose} title={t("title")} size="lg">
        <Stack>
          <Stepper active={step} size="sm">
            <Stepper.Step label={tBackup("action.restore.step.upload")} />
            <Stepper.Step label={tBackup("action.restore.step.validate")} />
          </Stepper>

          {step === 0 && (
            <Stack>
              <Alert color="blue" icon={<IconAlertTriangle />}>
                {t("description")}
              </Alert>

              <BackupFileDropzone onDrop={handleFileDrop} loading={validatePending} tBackup={tBackup} />
            </Stack>
          )}

          {step === 1 && validation && (
            <>
              <BackupValidationSummary validation={validation} tBackup={tBackup} />

              {validation.valid && (
                <Button onClick={handleRestore} loading={restorePending} color="blue">
                  {t("confirm")}
                </Button>
              )}
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
};
