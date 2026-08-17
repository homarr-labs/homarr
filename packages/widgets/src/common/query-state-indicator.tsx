"use client";

import { ActionIcon, Center, Loader, Tooltip, VisuallyHidden } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

interface WidgetQueryErrorIndicatorProps {
  error: unknown;
  label: string;
}

/** Localized warning for stale or optional-query failures. Never renders the raw error. */
export function WidgetQueryErrorIndicator({ error, label }: WidgetQueryErrorIndicatorProps) {
  const t = useScopedI18n("common.widgetQuery");
  if (!error) return null;

  const accessibleLabel = t("stale", { widget: label });
  return (
    <Tooltip label={accessibleLabel} position="left" withArrow>
      <ActionIcon
        component="span"
        color="orange"
        variant="subtle"
        size="sm"
        role="note"
        aria-label={accessibleLabel}
        tabIndex={0}
        style={{ cursor: "help" }}
      >
        <IconAlertTriangle aria-hidden style={iconSizes.sm} />
      </ActionIcon>
    </Tooltip>
  );
}

export function WidgetQueryLoadingState() {
  const t = useScopedI18n("common.widgetQuery");
  return (
    <Center component="output" h="100%" w="100%" p="sm" aria-live="polite">
      <Loader size="sm" />
      <VisuallyHidden>{t("loading")}</VisuallyHidden>
    </Center>
  );
}
