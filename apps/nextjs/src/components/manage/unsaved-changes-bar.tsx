"use client";

import type { ReactNode } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface UnsavedChangesBarProps {
  children: ReactNode;
}

export const UnsavedChangesBar = ({ children }: UnsavedChangesBarProps) => {
  const t = useI18n();

  return (
    <div style={{ position: "sticky", bottom: 20, zIndex: "var(--mantine-z-index-app)" }}>
      <Card withBorder bg="var(--mantine-color-body)">
        <Group justify="space-between" wrap="wrap">
          <Text fw={500}>{t("common.unsavedChanges")}</Text>
          <Group>{children}</Group>
        </Group>
      </Card>
    </div>
  );
};
