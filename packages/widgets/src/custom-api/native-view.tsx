"use client";

import type { CSSProperties, ReactNode } from "react";
import { Button, Center, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface CustomApiUnavailableViewProps {
  message: string;
  danger?: boolean;
  removeLabel?: string;
  supplementaryMessage?: string;
  onRemove?: () => void;
  iconStyle: CSSProperties;
  action?: ReactNode;
}

export function CustomApiUnavailableView({
  message,
  danger = false,
  removeLabel,
  supplementaryMessage,
  onRemove,
  iconStyle,
  action,
}: CustomApiUnavailableViewProps) {
  return (
    <Center h="100%" p="sm">
      <Stack align="center" gap="xs">
        <IconAlertTriangle style={iconStyle} color={`var(--mantine-color-${danger ? "red" : "yellow"}-6)`} />
        <Text c="dimmed" size="sm" ta="center">
          {message}
        </Text>
        {supplementaryMessage && (
          <Text size="sm" fw={600} ta="center">
            {supplementaryMessage}
          </Text>
        )}
        {action}
        {removeLabel && onRemove && (
          <Button size="compact-sm" color="red" variant="light" onClick={onRemove}>
            {removeLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
