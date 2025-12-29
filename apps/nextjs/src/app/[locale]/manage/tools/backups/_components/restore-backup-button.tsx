"use client";

import { useCallback, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  List,
  Modal,
  Radio,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconCheck, IconDatabaseImport, IconUpload, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

type ValidationResult = RouterOutputs["backup"]["validate"];
type RestoreMode = "full" | "merge";

export const RestoreBackupButton = () => {
  const tBackup = useScopedI18n("backup");
  const [opened, { open, close }] = useDisclosure(false);
  const [step, setStep] = useState(0);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [createBackupFirst, setCreateBackupFirst] = useState(true);

  const validateMutation = clientApi.backup.validate.useMutation();
  const restoreMutation = clientApi.backup.restore.useMutation();

  const handleClose = useCallback(() => {
    close();
    setStep(0);
    setFileContent(null);
    setValidation(null);
    setMode("merge");
    setCreateBackupFirst(true);
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
      const result = await restoreMutation.mutateAsync({
        fileContent,
        mode,
        createBackupFirst,
      });

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
        handleClose();
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch {
      showErrorNotification({
        title: tBackup("action.restore.error.title"),
        message: tBackup("action.restore.error.message"),
      });
    }
  }, [fileContent, restoreMutation, mode, createBackupFirst, tBackup, handleClose]);

  return (
    <>
      <Button variant="default" leftSection={<IconDatabaseImport size={16} stroke={1.5} />} onClick={open}>
        {tBackup("action.restore.label")}
      </Button>

      <Modal opened={opened} onClose={handleClose} title={tBackup("action.restore.label")} size="lg">
        <Stack>
          <Stepper active={step} size="sm">
            <Stepper.Step label={tBackup("action.restore.step.upload")} />
            <Stepper.Step label={tBackup("action.restore.step.validate")} />
            <Stepper.Step label={tBackup("action.restore.step.configure")} />
          </Stepper>

          {/* Step 0: Upload */}
          {step === 0 && (
            <Stack>
              <Dropzone
                onDrop={handleFileDrop}
                accept={["application/zip"]}
                maxFiles={1}
                loading={validateMutation.isPending}
              >
                <Stack align="center" gap="sm" py="xl">
                  <Dropzone.Accept>
                    <ThemeIcon size={48} radius="xl" color="green" variant="light">
                      <IconCheck size={24} />
                    </ThemeIcon>
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <ThemeIcon size={48} radius="xl" color="red" variant="light">
                      <IconX size={24} />
                    </ThemeIcon>
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <ThemeIcon size={48} radius="xl" color="gray" variant="light">
                      <IconUpload size={24} />
                    </ThemeIcon>
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

          {/* Step 1: Validation */}
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
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(2)}>Continue</Button>
                </Group>
              )}
            </Stack>
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
                onChange={(event) => setCreateBackupFirst(event.target.checked)}
              />

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleRestore}
                  loading={restoreMutation.isPending}
                  color={mode === "full" ? "red" : "blue"}
                >
                  {tBackup("action.restore.confirm")}
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
};
