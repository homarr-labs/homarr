import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Group, Radio, Stack, Stepper } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { useBackupFileValidation } from "../_hooks/use-backup-file-validation";
import { BackupFileDropzone } from "./backup-file-dropzone";
import { BackupValidationSummary } from "./backup-validation-summary";

type RestoreMode = "full" | "merge";

export const RestoreBackupModal = createModal(({ actions }) => {
  const t = useI18n();
  const tBackup = useScopedI18n("backup");
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [createBackupFirst, setCreateBackupFirst] = useState(true);

  const validateMutation = clientApi.backup.validate.useMutation();
  const { mutate: restore, isPending: restorePending } = clientApi.backup.restore.useMutation({
    onSuccess: (result) => {
      if (result.requiresOnboarding) {
        showSuccessNotification({
          title: tBackup("action.restore.success.title"),
          message: tBackup("action.restore.success.redirectOnboarding"),
        });
        setTimeout(() => {
          window.location.href = "/init";
        }, 1500);
      } else if (result.requiresLogin) {
        showSuccessNotification({
          title: tBackup("action.restore.success.title"),
          message: tBackup("action.restore.success.redirectLogin"),
        });
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1500);
      } else {
        showSuccessNotification({
          title: tBackup("action.restore.success.title"),
          message: tBackup("action.restore.success.message"),
        });
        actions.closeModal();
        // Refresh the page to show updated data
        window.location.reload();
      }
    },
    onError: () => {
      showErrorNotification({
        title: tBackup("action.restore.error.title"),
        message: tBackup("action.restore.error.message"),
      });
    },
  });

  const { fileContent, validation, isPending, handleFileDrop } = useBackupFileValidation({
    validateMutation,
  });

  // Auto-advance to validation step when validation completes successfully
  useEffect(() => {
    if (step === 0 && validation) {
      setStep(1);
    }
  }, [step, validation]);

  const handleRestore = () => {
    if (!fileContent) return;

    restore({
      fileContent,
      mode,
      createBackupFirst,
    });
  };

  return (
    <Stack>
      <Stepper active={step} size="sm">
        <Stepper.Step label={tBackup("action.restore.step.upload")} />
        <Stepper.Step label={tBackup("action.restore.step.validate")} />
        <Stepper.Step label={tBackup("action.restore.step.configure")} />
      </Stepper>

      {/* Step 0: Upload */}
      {step === 0 && (
        <Stack>
          <BackupFileDropzone onDrop={handleFileDrop} loading={isPending} tBackup={tBackup} />
        </Stack>
      )}

      {/* Step 1: Validation */}
      {step === 1 && validation && (
        <>
          <BackupValidationSummary validation={validation} tBackup={tBackup} />

          {validation.valid && (
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setStep(0)}>
                {t("common.action.previous")}
              </Button>
              <Button onClick={() => setStep(2)}>{t("common.action.continue")}</Button>
            </Group>
          )}
        </>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <Stack>
          <Radio.Group
            label={tBackup("action.restore.mode.label")}
            value={mode}
            onChange={(value) => setMode(value as RestoreMode)}
          >
            <Stack mt="xs" gap="sm">
              <Radio
                value="merge"
                label={tBackup("action.restore.mode.merge.label")}
                description={tBackup("action.restore.mode.merge.description")}
              />
              <Radio
                value="full"
                label={tBackup("action.restore.mode.full.label")}
                description={tBackup("action.restore.mode.full.description")}
              />
            </Stack>
          </Radio.Group>

          {mode === "full" && (
            <Stack gap="sm">
              <Alert color="red" icon={<IconAlertTriangle />}>
                {tBackup("action.restore.mode.full.warning")}
              </Alert>
              <Alert color="orange" icon={<IconAlertTriangle />}>
                {tBackup("action.restore.mode.full.sessionWarning")}
              </Alert>
            </Stack>
          )}

          <Checkbox
            label={tBackup("action.restore.createBackupFirst")}
            checked={createBackupFirst}
            onChange={(event) => setCreateBackupFirst(event.currentTarget.checked)}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setStep(1)}>
              {t("common.action.previous")}
            </Button>
            <Button onClick={handleRestore} loading={restorePending} color={mode === "full" ? "red" : "blue"}>
              {tBackup("action.restore.confirm")}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}).withOptions({
  size: "lg",
  defaultTitle: (t) => t("backup.action.restore.label"),
});
