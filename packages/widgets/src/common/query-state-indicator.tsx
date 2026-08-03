"use client";

import { Box, Center, Loader, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface WidgetQueryErrorIndicatorProps {
  error: unknown;
  label: string;
}

/** Localized warning for stale or optional-query failures. Never renders the raw error. */
export function WidgetQueryErrorIndicator({ error, label }: WidgetQueryErrorIndicatorProps) {
  if (!error) return null;

  const accessibleLabel = label;
  return (
    <Tooltip label={accessibleLabel} position="left" withArrow>
      <Box
        component="span"
        c="orange"
        role="img"
        aria-label={accessibleLabel}
        tabIndex={0}
        style={{ display: "inline-flex", cursor: "help" }}
      >
        <IconAlertTriangle aria-hidden size={14} />
      </Box>
    </Tooltip>
  );
}

export function WidgetQueryLoadingState() {
  return (
    <Center h="100%" w="100%" p="sm" role="status" aria-live="polite">
      <Loader size="sm" />
    </Center>
  );
}
