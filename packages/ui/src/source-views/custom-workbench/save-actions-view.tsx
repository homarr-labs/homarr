"use client";

import { Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

import type { SaveActionsProps } from "./contracts";

export function SaveActions({ dirty, savePending, previewPending, invalid, mode, onPreview, copy }: SaveActionsProps) {
  return (
    <Group justify="space-between" wrap="wrap">
      <Group gap="xs">
        {invalid ? (
          <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
        ) : (
          <IconCheck size={16} color="var(--mantine-color-green-6)" />
        )}
        <Text size="sm" fw={600}>
          {invalid ? copy.status.invalid : dirty ? copy.status.unsaved : copy.status.ready}
        </Text>
      </Group>
      <Group gap="xs" wrap="wrap">
        <Button
          type="button"
          variant="light"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={onPreview}
          loading={previewPending}
          disabled={invalid || savePending}
        >
          {previewPending ? copy.action.previewLoading : copy.action.preview}
        </Button>
        <Button type="submit" loading={savePending} disabled={invalid || previewPending}>
          {mode === "create" ? copy.action.create : copy.action.save}
        </Button>
      </Group>
    </Group>
  );
}
