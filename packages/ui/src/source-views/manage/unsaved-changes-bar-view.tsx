"use client";

import { Card, Group, Text } from "@mantine/core";

import type { UnsavedChangesBarViewProps } from "./contracts";

export const UnsavedChangesBarView = ({ label, children }: UnsavedChangesBarViewProps) => {
  return (
    <div style={{ position: "sticky", bottom: 20, zIndex: "var(--mantine-z-index-app)" }}>
      <Card withBorder bg="var(--mantine-color-body)">
        <Group justify="space-between" wrap="wrap">
          <Text fw={500}>{label}</Text>
          <Group>{children}</Group>
        </Group>
      </Card>
    </div>
  );
};
