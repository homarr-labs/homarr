"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Icon } from "@tabler/icons-react";
import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconApi,
  IconBraces,
  IconCheck,
  IconCode,
  IconDatabase,
  IconEye,
  IconPlayerPlay,
  IconSettings,
} from "@tabler/icons-react";

import { getCustomWidgetDefaultOptions } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { useCustomWidgetFormDocumentDirty } from "./_custom-widget-form-state";
import { areCustomWidgetValuesEqual } from "./_custom-widget-value-equality";
import { useCustomWidgetFormAnalysisField } from "./_use-custom-widget-form-analysis";
import { useUnsavedChangesGuard } from "./_use-unsaved-changes-guard";
import classes from "./_custom-widget-form.module.css";

const sectionLinks = [
  ["general", "section.general", IconSettings],
  ["sources", "section.sources", IconApi],
  ["requests", "section.requests", IconDatabase],
  ["options", "section.options", IconBraces],
  ["jsx", "section.jsx", IconCode],
  ["preview", "section.preview", IconEye],
] as const;

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

export function CustomWidgetSectionNavigation({
  onSelect,
}: {
  onSelect(section: (typeof sectionLinks)[number][0]): void;
}) {
  const t = useI18n("customWidget.workbench");
  const invalidSections = useCustomWidgetFormAnalysisField("invalidSections");
  return (
    <nav className={classes.sectionNav} aria-label={t("sectionNavigation")}>
      {sectionLinks.map(([id, key, SectionIcon]) => {
        const invalid = invalidSections.has(id);
        return (
          <Button
            key={id}
            component="a"
            href={`#${id}`}
            onClick={() => onSelect(id)}
            size="compact-sm"
            variant="subtle"
            color={invalid ? "red" : undefined}
            leftSection={<SectionIcon size={14} />}
            rightSection={invalid ? <IconAlertCircle size={13} aria-label={t("status.invalid")} /> : undefined}
          >
            {t(key)}
          </Button>
        );
      })}
    </nav>
  );
}

export function CustomWidgetSaveActions({
  mode,
  savePending,
  previewPending,
  onPreview,
}: {
  mode: "create" | "edit";
  savePending: boolean;
  previewPending: boolean;
  onPreview(): void;
}) {
  const dirty = useCustomWidgetFormDocumentDirty();
  const candidateValid = useCustomWidgetFormAnalysisField("candidateValid");
  const hasDiagnostics = useCustomWidgetFormAnalysisField("hasDiagnostics");
  return (
    <SaveActions
      dirty={dirty}
      savePending={savePending}
      previewPending={previewPending}
      invalid={hasDiagnostics || !candidateValid}
      mode={mode}
      onPreview={onPreview}
    />
  );
}

export function CustomWidgetUnsavedChangesGuard() {
  const dirty = useCustomWidgetFormDocumentDirty();
  useUnsavedChangesGuard(dirty);
  return null;
}

export function CustomWidgetOptionsSnapshotSync({
  setOptionsSnapshot,
}: {
  setOptionsSnapshot: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const parsedOptions = useCustomWidgetFormAnalysisField("parsedOptions");
  const lastDefaults = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!parsedOptions.success) return;
    const defaults = getCustomWidgetDefaultOptions(parsedOptions.data);
    if (lastDefaults.current && areCustomWidgetValuesEqual(lastDefaults.current, defaults)) return;
    lastDefaults.current = defaults;
    setOptionsSnapshot(defaults);
  }, [parsedOptions, setOptionsSnapshot]);
  return null;
}
