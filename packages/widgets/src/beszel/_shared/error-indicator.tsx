"use client";

import { Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface IntegrationResult {
  integrationId: string;
  integrationName?: string;
  error?: string;
}

interface BeszelIntegrationErrorIndicatorProps {
  results: IntegrationResult[];
  isStale?: boolean;
}

export function BeszelIntegrationErrorIndicator({ results, isStale = false }: BeszelIntegrationErrorIndicatorProps) {
  const t = useI18n();
  const failed = results.filter((r) => "error" in r && r.error);
  if (failed.length === 0 && !isStale) return null;
  const label =
    failed.length > 0
      ? failed.map((r) => r.integrationName ?? r.integrationId).join(", ")
      : t("board.mobile.dataWarning");
  return (
    <Tooltip label={label} position="left" withArrow>
      <IconAlertTriangle
        size={14}
        color="var(--mantine-color-orange-6)"
        style={{ cursor: "help", flexShrink: 0 }}
        aria-label={label}
      />
    </Tooltip>
  );
}
