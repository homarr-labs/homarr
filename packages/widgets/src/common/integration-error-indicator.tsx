"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

interface IntegrationResult {
  integrationId: string;
  integrationName?: string;
  error?: string;
}

interface IntegrationErrorIndicatorProps {
  results: readonly IntegrationResult[];
}

export function IntegrationErrorIndicator({ results }: IntegrationErrorIndicatorProps) {
  const t = useScopedI18n("common");
  const failed = results.filter((result) => Boolean(result.error));
  if (failed.length === 0) return null;

  const names = failed.map((result) => result.integrationName ?? result.integrationId).join(", ");
  const label = `${t("error")}: ${names}`;
  return (
    <Tooltip label={label} position="left" withArrow>
      <ActionIcon variant="transparent" color="orange" size={28} aria-label={label} style={{ cursor: "help" }}>
        <IconAlertTriangle aria-hidden style={iconSizes.sm} />
      </ActionIcon>
    </Tooltip>
  );
}
