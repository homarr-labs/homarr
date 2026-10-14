"use client";

import { Alert, Box, Text, Tooltip } from "@mantine/core";

import type { PreviewResultProps, PreviewStatusDotProps } from "./contracts";

export function PreviewResult({ outcome, title, description }: PreviewResultProps) {
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

export function PreviewStatusDot({ outcome, label }: PreviewStatusDotProps) {
  const colors = { idle: "gray", loading: "yellow", success: "green", error: "red" };
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
