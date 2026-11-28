"use client";

import { useMemo } from "react";
import { Box, Stack, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { getWidgetRefreshInterval } from "../refresh-interval";
import { useDemoReadOnly } from "../demo-read-only";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { HealthSystem } from "./model";
import { SystemHealthView } from "./system-view";
import { useHealthHistory } from "./use-health-history";
import type { HealthOptions } from "./display";
import { useHealthBounds } from "./use-health-bounds";

export { formatUptime, matchFileSystemAndSmart, progressColor } from "./format";

const emptyResults: RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"] = [];

export function SystemHealthMonitoring(
  props: WidgetComponentProps<"healthMonitoring"> & {
    integrations: RouterOutputs["integration"]["byIds"];
    onPreferences: (changes: Partial<HealthOptions>) => void;
  },
) {
  const t = useI18n("widget.healthMonitoring.rework");
  const refreshInterval = getWidgetRefreshInterval(props.options, 10);
  const demoReadOnly = useDemoReadOnly();
  let pollInterval: number | false = refreshInterval * 1000;
  if (demoReadOnly) pollInterval = false;
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery(
    { integrationIds: props.integrationIds, refreshInterval },
    { refetchInterval: pollInterval },
  );
  const results = getUsableWidgetQueryData(healthQuery) ?? emptyResults;
  const histories = useHealthHistory(results, healthQuery.dataUpdatedAt, props.widgetStateRef, refreshInterval);
  const bounds = useHealthBounds(props.displayScale);
  const systems = useMemo(() => {
    const byId = new Map(results.map((result) => [result.integrationId, result]));
    const kinds = new Map(props.integrations.map((integration) => [integration.id, integration.kind]));
    return props.integrationIds.flatMap<HealthSystem>((id) => {
      const result = byId.get(id);
      const kind = kinds.get(id);
      if (!result || !kind) return [];
      return [
        {
          id,
          name: result.integrationName,
          kind,
          health: result.healthInfo,
          updatedAt: result.updatedAt?.getTime(),
          refreshInterval,
          error: result.error,
          history: histories[id] ?? [],
        },
      ];
    });
  }, [results, props.integrationIds, props.integrations, histories, refreshInterval]);
  let layoutScale = 1;
  if (props.displayMode !== "advanced" && Number.isFinite(props.displayScale) && (props.displayScale ?? 0) > 0) {
    layoutScale = props.displayScale ?? 1;
  }
  if (isInitialWidgetQueryPending(healthQuery)) return <WidgetQueryLoadingState />;
  return (
    <Stack h="100%" gap={0} mih={0} miw={0}>
      {healthQuery.isError && (
        <Tooltip label={t("refreshFailed")} withArrow events={{ hover: true, focus: true, touch: true }}>
          <Text
            component="output"
            tabIndex={0}
            size="xs"
            c="var(--health-warning)"
            px="sm"
            py={3}
            lineClamp={1}
            style={{ flexShrink: 0 }}
          >
            {t("refreshFailed")}
          </Text>
        </Tooltip>
      )}
      <Box ref={bounds.ref} flex={1} mih={0} miw={0}>
        <SystemHealthView
          systems={systems}
          selectedId={props.options.selectedSystem}
          onSelect={(id) => props.onPreferences({ selectedSystem: id })}
          onPreferences={props.onPreferences}
          width={bounds.width || props.width * layoutScale}
          height={bounds.height || props.height * layoutScale}
          advanced={props.displayMode === "advanced"}
          options={props.options}
          isEditMode={props.isEditMode}
        />
      </Box>
    </Stack>
  );
}
