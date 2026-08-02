"use client";

import { Tooltip, VisuallyHidden } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface IntegrationResult {
  integrationId: string;
  integrationName?: string;
  error?: string;
}

interface IntegrationErrorIndicatorProps {
  results: readonly IntegrationResult[];
}

export function IntegrationErrorIndicator({ results }: IntegrationErrorIndicatorProps) {
  const t = useI18n();
  const failed = results.filter((result) => Boolean(result.error));
  if (failed.length === 0) return null;

  const names = failed.map((result) => result.integrationName ?? result.integrationId).join(", ");
  const label = `${t("common.error")}: ${names}`;
  return (
    <Tooltip label={label} position="left" withArrow>
      <span style={{ display: "inline-flex" }}>
        <IconAlertTriangle
          aria-hidden
          size={14}
          color="var(--mantine-color-orange-6)"
          style={{ cursor: "help", flexShrink: 0 }}
        />
        <VisuallyHidden>{label}</VisuallyHidden>
      </span>
    </Tooltip>
  );
}
