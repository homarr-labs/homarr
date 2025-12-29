"use client";

import { useCallback, useState } from "react";
import { Alert, Badge, Button, Group, List, Modal, Stack, Stepper, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconCheck, IconDatabaseImport, IconUpload, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

type ValidationResult = RouterOutputs["backup"]["validate"];

interface RestoreBackupButtonProps {
  children: React.ReactNode;
}

export const RestoreBackupButton = ({ children }: RestoreBackupButtonProps) => {
  const t = useScopedI18n("init.step.start.restore");
  const tBackup = useScopedI18n("backup");
  const [opened, { open, close }] = useDisclosure(false);
  const [step, setStep] = useState(0);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const validateMutation = clientApi.backup.validateOnboarding.useMutation();
  const restoreMutation = clientApi.backup.restoreOnboarding.useMutation();

  const handleClose = useCallback(() => {
    close();
    setStep(0);
    setFileContent(null);
    setValidation(null);
  }, [close]);

  const handleFileDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        if (!base64) return;

        setFileContent(base64);

        try {
          const result = await validateMutation.mutateAsync({ fileContent: base64 });
          setValidation(result);
          setStep(1);
        } catch {
          showErrorNotification({
            title: tBackup("action.restore.validation.error.title"),
            message: tBackup("action.restore.validation.error.message"),
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [validateMutation, tBackup],
  );

  const handleRestore = useCallback(async () => {
    if (!fileContent) return;

    try {
      await restoreMutation.mutateAsync({
        fileContent,
      });

      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });

      // Hard redirect to login after successful restore
      // Using window.location for full page reload since server state changed
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 1500);
    } catch {
      showErrorNotification({
        title: tBackup("action.restore.error.title"),
        message: tBackup("action.restore.error.message"),
      });
    }
  }, [fileContent, restoreMutation, t, tBackup]);

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

              <Dropzone
                onDrop={handleFileDrop}
                accept={["application/zip"]}
                maxFiles={1}
                loading={validateMutation.isPending}
              >
                <Stack align="center" gap="sm" py="xl">
                  <Dropzone.Accept>
                    <IconCheck size={48} color="green" />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={48} color="red" />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconUpload size={48} opacity={0.5} />
                  </Dropzone.Idle>
                  <Text size="lg" fw={500}>
                    {tBackup("action.restore.dropzone.title")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {tBackup("action.restore.dropzone.description")}
                  </Text>
                </Stack>
              </Dropzone>
            </Stack>
          )}

          {step === 1 && validation && (
            <Stack>
              {validation.valid ? (
                <Alert color="green" icon={<IconCheck />}>
                  {tBackup("action.restore.validation.valid")}
                </Alert>
              ) : (
                <Alert color="red" icon={<IconX />}>
                  {tBackup("action.restore.validation.invalid")}
                </Alert>
              )}

              {validation.errors.length > 0 && (
                <Stack gap="xs">
                  <Text fw={500} c="red">
                    {tBackup("action.restore.validation.errors")}
                  </Text>
                  <List size="sm">
                    {validation.errors.map((error) => (
                      <List.Item key={error} c="red">
                        {error}
                      </List.Item>
                    ))}
                  </List>
                </Stack>
              )}

              {validation.warnings.length > 0 && (
                <Stack gap="xs">
                  <Text fw={500} c="yellow">
                    {tBackup("action.restore.validation.warnings")}
                  </Text>
                  <List size="sm">
                    {validation.warnings.map((warning) => (
                      <List.Item key={warning} c="yellow">
                        {warning}
                      </List.Item>
                    ))}
                  </List>
                </Stack>
              )}

              <Stack gap="xs">
                <Text fw={500}>{tBackup("action.restore.validation.summary")}</Text>
                <Group gap="xs">
                  <Badge>{validation.summary.boards} boards</Badge>
                  <Badge>{validation.summary.integrations} integrations</Badge>
                  <Badge>{validation.summary.users} users</Badge>
                  <Badge>{validation.summary.groups} groups</Badge>
                  <Badge>{validation.summary.apps} apps</Badge>
                  <Badge>{validation.summary.searchEngines} search engines</Badge>
                  <Badge>{validation.summary.mediaFiles} media files</Badge>
                </Group>
              </Stack>

              {validation.valid && (
                <Button onClick={handleRestore} loading={restoreMutation.isPending} color="blue">
                  {t("confirm")}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
};
