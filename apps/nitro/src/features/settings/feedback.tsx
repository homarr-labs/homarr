import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";

import { extractErrorMessage } from "../../../../../packages/common/src/error";
import { useI18n } from "../../../../../packages/translation/src/standalone/client";

import type { SettingsAccess } from "./client";
import type { SettingsDraftStatus } from "./draft";

export function SettingsFeedback({
  access,
  status,
  dirty,
  valid,
  onDiscard,
}: {
  readonly access: SettingsAccess;
  readonly status: SettingsDraftStatus;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly onDiscard: () => void;
}) {
  const t = useI18n();
  return (
    <Stack gap="sm" aria-live="polite">
      {access.kind !== "editable" && <Alert color="yellow">{access.reason}</Alert>}
      {status.kind === "error" && (
        <Alert color="red" title={t("common.notification.update.error")} role="alert">
          {status.errors.map((error, index) => (
            <Text key={index} size="sm">
              {error instanceof Error || typeof error === "string"
                ? extractErrorMessage(error)
                : t("common.notification.update.error")}
            </Text>
          ))}
        </Alert>
      )}
      {status.kind === "saved" && (
        <Alert color="green">{t("management.page.settings.notification.success.message")}</Alert>
      )}
      {dirty && access.kind === "editable" && (
        <Paper withBorder p="md" style={{ position: "sticky", bottom: 20 }}>
          <Group justify="space-between" wrap="wrap">
            <Text fw={500}>{t("common.unsavedChanges")}</Text>
            <Group>
              <Button type="button" variant="default" disabled={status.kind === "pending"} onClick={onDiscard}>
                {t("common.action.discard")}
              </Button>
              <Button type="submit" loading={status.kind === "pending"} disabled={!valid}>
                {t("common.action.saveChanges")}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
