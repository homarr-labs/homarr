"use client";

import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

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
  savePending,
  previewPending,
  invalid,
  mode,
  onPreview,
}: {
  dirty: boolean;
  savePending: boolean;
  previewPending: boolean;
  invalid: boolean;
  mode: "create" | "edit";
  onPreview(): void;
}) {
  const t = useI18n("customWidget.workbench");
  const tCommon = useI18n("common");
  return (
    <Group justify="space-between" wrap="wrap">
      <Group gap="xs">
        {invalid ? (
          <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
        ) : (
          <IconCheck size={16} color="var(--mantine-color-green-6)" />
        )}
        <Text size="sm" fw={600}>
          {invalid ? t("status.invalid") : dirty ? t("status.unsaved") : t("status.ready")}
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
          {previewPending ? t("action.previewLoading") : t("action.preview")}
        </Button>
        <Button type="submit" loading={savePending} disabled={invalid || previewPending}>
          {mode === "create" ? tCommon("action.create") : tCommon("action.save")}
        </Button>
      </Group>
    </Group>
  );
}
