"use client";

import { Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface IntegrationResult {
  integrationId: string;
  integrationName?: string;
  error?: string;
}

interface BeszelIntegrationErrorIndicatorProps {
  results: IntegrationResult[];
}

export function BeszelIntegrationErrorIndicator({ results }: BeszelIntegrationErrorIndicatorProps) {
  const failed = results.filter((r) => "error" in r && r.error);
  if (failed.length === 0) return null;
  const label = failed.map((r) => r.integrationName ?? r.integrationId).join(", ");
  return (
    <Tooltip label={label} position="left" withArrow>
      <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" style={{ cursor: "help", flexShrink: 0 }} />
    </Tooltip>
  );
}
