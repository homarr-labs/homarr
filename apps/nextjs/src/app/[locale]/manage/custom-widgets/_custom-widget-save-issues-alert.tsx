"use client";

import { Alert, Button, CopyButton, Text, Textarea } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { CustomWidgetSaveIssue } from "./_custom-widget-save-errors";

export function CustomWidgetSaveIssuesAlert({ issues }: { issues: CustomWidgetSaveIssue[] }) {
  const t = useI18n("customWidget.workbench.saveError");
  if (issues.length === 0) return null;
  const value = issues.map((issue) => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("\n");

  return (
    <Alert color="red" title={t("title")} icon={<IconAlertCircle size={18} />}>
      <Text size="sm" mb="xs">
        {t("description")}
      </Text>
      <Textarea value={value} readOnly autosize minRows={2} maxRows={10} aria-label={t("errors")} mb="xs" />
      <CopyButton value={value} timeout={2_000}>
        {({ copied, copy }) => (
          <Button
            type="button"
            size="compact-sm"
            variant="light"
            color={copied ? "green" : "red"}
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={copy}
          >
            {copied ? t("copied") : t("copy")}
          </Button>
        )}
      </CopyButton>
    </Alert>
  );
}
