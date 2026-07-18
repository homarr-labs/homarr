"use client";

import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import classes from "./_custom-widget-form.module.css";

export function EditorSection({
  id,
  title,
  icon: SectionIcon,
  children,
}: {
  id: string;
  title: string;
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <Card id={id} component="section" withBorder p="lg" className={classes.editorSection}>
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon variant="light" size="lg">
            <SectionIcon size={18} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            {title}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}

export function SaveActions({
  dirty,
  pending,
  invalid,
  mode,
  onPreview,
}: {
  dirty: boolean;
  pending: boolean;
  invalid: boolean;
  mode: "create" | "edit";
  onPreview(): void;
}) {
  const t = useScopedI18n("customWidget.workbench");
  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="xs">
        {invalid ? (
          <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
        ) : (
          <IconCheck size={16} color="var(--mantine-color-green-6)" />
        )}
        <Text size="sm" fw={600}>
          {dirty ? t("status.unsaved") : invalid ? t("status.invalid") : t("status.ready")}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Button type="button" variant="light" leftSection={<IconPlayerPlay size={16} />} onClick={onPreview}>
          {t("action.preview")}
        </Button>
        <Button type="submit" loading={pending} disabled={invalid}>
          {mode === "create" ? t("action.create") : t("action.save")}
        </Button>
      </Group>
    </Group>
  );
}
