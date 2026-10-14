"use client";

import { Button, Group, Loader, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconAlertTriangle, IconCheck, IconDatabaseImport, IconRefresh } from "@tabler/icons-react";

import type { RestoreProgressViewProps } from "./contracts";

export const RestoreProgressView = ({
  active,
  status,
  reloginRequired = false,
  progressTitle,
  restartingLabel,
  timeoutTitle,
  timeoutMessage,
  reloginLabel,
  retryLabel,
  reloadLabel,
  onRetryReadiness,
  onReload,
}: RestoreProgressViewProps) => {
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  const isRestoring = status === "restoring";
  const isTimedOut = status === "timedOut";
  const statusLabel = isRestoring ? progressTitle : isTimedOut ? timeoutMessage : restartingLabel;

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
              {isTimedOut ? timeoutTitle : progressTitle}
            </Text>
            <Text size="xs" c="dimmed">
              {statusLabel}
            </Text>
          </div>
        </Group>

        {reloginRequired && !isRestoring ? (
          <Text size="sm" c="dimmed">
            {reloginLabel}
          </Text>
        ) : null}

        {isTimedOut ? (
          <Group>
            <Button variant="light" onClick={onRetryReadiness} leftSection={<IconRefresh size={16} />}>
              {retryLabel}
            </Button>
            <Button variant="default" onClick={onReload}>
              {reloadLabel}
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
};
