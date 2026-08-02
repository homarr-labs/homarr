"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
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
      <ActionIcon variant="transparent" color="orange" size={18} aria-label={label} style={{ cursor: "help" }}>
        <IconAlertTriangle aria-hidden size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
