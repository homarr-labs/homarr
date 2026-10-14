"use client";

import { Alert, Button, CopyButton, Text, Textarea } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy } from "@tabler/icons-react";

import type { CustomWidgetSaveIssuesAlertProps } from "./contracts";

export function CustomWidgetSaveIssuesAlert({ issues, copy: labels }: CustomWidgetSaveIssuesAlertProps) {
  if (issues.length === 0) return null;
  const value = issues.map((issue) => `${issue.path ? `${issue.path}: ` : ""}${issue.message}`).join("\n");

  return (
    <Alert color="red" title={labels.title} icon={<IconAlertCircle size={18} />}>
      <Text size="sm" mb="xs">
        {labels.description}
      </Text>
      <Textarea value={value} readOnly autosize minRows={2} maxRows={10} aria-label={labels.errors} mb="xs" />
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
            {copied ? labels.copied : labels.copy}
          </Button>
        )}
      </CopyButton>
    </Alert>
  );
}
