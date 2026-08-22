"use client";

import { Button, Group, Loader, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconAlertTriangle, IconCheck, IconDatabaseImport, IconRefresh } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export type RestoreProgressStatus = "restoring" | "restarting" | "timedOut";

interface RestoreProgressPanelProps {
  active: boolean;
  status: RestoreProgressStatus;
  onRetry: () => void;
  onReload: () => void;
}

export const RestoreProgressPanel = ({ active, status, onRetry, onReload }: RestoreProgressPanelProps) => {
  const t = useI18n("management.page.tool.backup.restore");
  const tCommon = useI18n("common");
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  const isRestoring = status === "restoring";
  const isTimedOut = status === "timedOut";
  const statusLabel = isRestoring ? t("progress.title") : isTimedOut ? t("timeout.message") : t("progress.restarting");

  return (
    <Paper
      component="output"
      p="lg"
      radius="md"
      bg="var(--mantine-color-dark-7)"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={!isTimedOut}
    >
      <Stack gap="md">
        <Group gap="sm">
          {isTimedOut ? (
            <ThemeIcon size="lg" radius="xl" color="orange" variant="light" aria-hidden="true">
              <IconAlertTriangle size={18} />
            </ThemeIcon>
          ) : !isRestoring ? (
            <ThemeIcon size="lg" radius="xl" color="green" variant="light" aria-hidden="true">
              <IconCheck size={18} />
            </ThemeIcon>
          ) : reduceMotion ? (
            <ThemeIcon size="lg" radius="xl" color="blue" variant="light" aria-hidden="true">
              <IconDatabaseImport size={18} />
            </ThemeIcon>
          ) : (
            <Loader size="sm" color="blue" aria-hidden="true" />
          )}
          <div>
            <Text size="sm" fw={600}>
              {isTimedOut ? t("timeout.title") : t("progress.title")}
            </Text>
            <Text size="xs" c="dimmed">
              {statusLabel}
            </Text>
          </div>
        </Group>

        {isTimedOut ? (
          <Group>
            <Button variant="light" onClick={onRetry} leftSection={<IconRefresh size={16} />}>
              {tCommon("action.tryAgain")}
            </Button>
            <Button variant="default" onClick={onReload}>
              {tCommon("action.refresh")}
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
};
