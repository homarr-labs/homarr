"use client";

import { Alert, Box, Text, Tooltip } from "@mantine/core";

import { isRecord } from "./_custom-widget-form-utils";

export type PreviewOutcome = "idle" | "loading" | "success" | "error";

export function PreviewResult({
  outcome,
  title,
  description,
}: {
  outcome: PreviewOutcome;
  title: string;
  description: string;
}) {
  if (outcome === "idle") return null;
  return (
    <Alert color={outcome === "error" ? "red" : outcome === "success" ? "green" : "yellow"}>
      <Text size="sm" fw={600}>
        {title}
      </Text>
      <Text size="sm">{description}</Text>
    </Alert>
  );
}

export function PreviewStatusDot({ outcome, label }: { outcome: PreviewOutcome; label: string }) {
  const colors = { idle: "gray", loading: "yellow", success: "green", error: "red" } as const;
  return (
    <Tooltip label={label}>
      <Box
        component="output"
        aria-label={label}
        w={8}
        h={8}
        bg={`var(--mantine-color-${colors[outcome]}-6)`}
        style={{ borderRadius: "50%", flexShrink: 0 }}
      />
    </Tooltip>
  );
}

export function getPreviewSummary(status: Record<string, unknown>) {
  return Object.values(status).reduce<{ succeeded: number; failed: number }>(
    (summary, value) => {
      if (isRecord(value) && value.ok === false) summary.failed += 1;
      else summary.succeeded += 1;
      return summary;
    },
    { succeeded: 0, failed: 0 },
  );
}
