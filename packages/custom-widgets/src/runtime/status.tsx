"use client";

import { Alert, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useCustomWidgetRuntime } from "./context";

export function MigrationRequiredAlert() {
  const { messages } = useCustomWidgetRuntime();
  return (
    <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs">{messages.migrationRequired}</Text>
    </Alert>
  );
}
