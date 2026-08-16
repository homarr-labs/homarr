"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

export type SetupMetricEvent =
  | "surface-opened"
  | "intent-selected"
  | "widget-started"
  | "dependency-blocked"
  | "dependency-resolved-inline"
  | "widget-completed"
  | "completion-recipe-selected"
  | "checklist-resumed";

export type SetupMetricEntryPoint = "header" | "spotlight" | "board" | "assistant" | "docker" | "management";

export interface SetupMetricProperties {
  entryPoint: SetupMetricEntryPoint;
  intent?: string;
  outcome?: "completed" | "blocked" | "continued";
  elapsedMs?: number;
  hasBoardContext?: boolean;
  canResolveInline?: boolean;
}

/**
 * Emits only coarse workflow measurements through Homarr's existing opt-in analytics gate.
 * Never pass record IDs, names, URLs, search text, credentials, or provider responses here.
 */
export const useSetupAnalytics = () => {
  const t = useI18n();
  const { mutate } = clientApi.analytics.trackFeature.useMutation({
    onError() {
      showErrorNotification({
        title: t("common.error"),
        message: t("universalCreate.analyticsError"),
      });
    },
  });

  return useCallback(
    (event: SetupMetricEvent, properties: SetupMetricProperties) => {
      mutate({ feature: `setup:${event}`, properties: { ...properties } });
    },
    [mutate],
  );
};
