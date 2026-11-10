"use client";

import { Box, Stack, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { HealthSystem } from "./model";
import { SystemHealthView } from "./system-view";
import { useHealthHistory } from "./use-health-history";
import { useHealthPreferences } from "./use-health-preferences";
import { useHealthBounds } from "./use-health-bounds";

export { formatUptime, matchFileSystemAndSmart, progressColor } from "./format";

const emptyResults: RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"] = [];

export function SystemHealthMonitoring(
  props: WidgetComponentProps<"healthMonitoring"> & {
    integrations?: RouterOutputs["integration"]["byIds"];
  },
) {
  const t = useI18n("widget.healthMonitoring.rework");
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds: props.integrationIds,
  });
  const results = getUsableWidgetQueryData(healthQuery) ?? emptyResults;
  const histories = useHealthHistory(results, healthQuery.dataUpdatedAt, props.widgetStateRef);
  const onPreferences = useHealthPreferences(props);
  const bounds = useHealthBounds(props.displayScale);
  const systems: HealthSystem[] = props.integrationIds.flatMap((id) => {
    const result = results.find((entry) => entry.integrationId === id);
    if (!result) return [];
    const integration = props.integrations?.find((entry) => entry.id === id);
    return [
      {
        id,
        name: result.integrationName,
        kind: integration?.kind ?? "mock",
        health: result.healthInfo,
        updatedAt: result.updatedAt?.getTime(),
        error: result.error,
        history: histories[id] ?? [],
      },
    ];
  });
  const selected = systems.find((system) => system.id === props.options.selectedSystem) ?? systems[0];
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
          selectedId={selected?.id ?? ""}
          onSelect={(id) => onPreferences({ selectedSystem: id })}
          onPreferences={onPreferences}
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
