"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Group, Modal, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { useWidgetNow } from "../common/use-widget-now";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { WidgetEmptyState } from "../common/empty-state";
import type { HealthOptions } from "./display";
import { isStaleReading, needsAttention } from "./display";
import { createSystemNameFormatter } from "./format";
import { projectHealthSystem } from "./model";
import type { HealthSystem } from "./model";
import { HealthAttentionFilter, SystemFleet } from "./system-fleet";
import { SystemTile } from "./system-tile";
import { useHealthBounds } from "./use-health-bounds";
import classes from "./system-view.module.css";
import healthClasses from "./health-monitoring.module.css";

const SystemHistoryComparison = dynamic(
  () => import("./system-advanced").then((module) => module.SystemHistoryComparison),
  { loading: WidgetQueryLoadingState },
);
const SystemDetail = dynamic(() => import("./system-detail").then((module) => module.SystemDetail), {
  loading: WidgetQueryLoadingState,
});
const SystemAdvanced = dynamic(() => import("./system-advanced").then((module) => module.SystemAdvanced), {
  loading: WidgetQueryLoadingState,
});

export interface SystemHealthViewProps {
  systems: HealthSystem[];
  width: number;
  height: number;
  advanced: boolean;
  options: HealthOptions;
  selectedId: string;
  onSelect: (id: string) => void;
  onPreferences: (options: Partial<HealthOptions>) => void;
  isEditMode: boolean;
}

export function SystemHealthView({
  systems,
  width,
  height,
  advanced,
  options,
  selectedId,
  onSelect,
  onPreferences,
  isEditMode,
}: SystemHealthViewProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const now = useWidgetNow()?.getTime();
  const coarsePointer = useMediaQuery("(any-pointer: coarse)");
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [dialogHeight, setDialogHeight] = useState(760);
  const modalBounds = useHealthBounds();
  const { visibleStorageVolumes, cpuThreshold, memoryThreshold, storageThreshold, systemSort } = options;
  const systemDisplayName = useMemo(() => createSystemNameFormatter(systems), [systems]);
  const projected = useMemo(
    () =>
      systems.map((system) =>
        projectHealthSystem(system, visibleStorageVolumes, cpuThreshold, memoryThreshold, storageThreshold),
      ),
    [systems, visibleStorageVolumes, cpuThreshold, memoryThreshold, storageThreshold],
  );
  const snapshots = useMemo(() => {
    if (systemSort === "configured") return projected;
    return projected.toSorted((left, right) => {
      if (systemSort === "name") return left.system.name.localeCompare(right.system.name);
      if (systemSort === "provider") {
        return (
          getIntegrationName(left.system.kind).localeCompare(getIntegrationName(right.system.kind)) ||
          left.system.name.localeCompare(right.system.name)
        );
      }
      if (systemSort === "cpu") return (right.cpuPercent ?? -1) - (left.cpuPercent ?? -1);
      if (systemSort === "memory") return (right.memory?.percent ?? -1) - (left.memory?.percent ?? -1);
      if (systemSort === "storage") return (right.fullestVolume?.percent ?? -1) - (left.fullestVolume?.percent ?? -1);
      return Number(needsAttention(right, now)) - Number(needsAttention(left, now));
    });
  }, [projected, systemSort, now]);
  const selected = snapshots.find((snapshot) => snapshot.system.id === selectedId) ?? snapshots[0];
  const dialog = snapshots.find((snapshot) => snapshot.system.id === dialogId);
  let dialogSize = 1100;
  if (dialog && !dialog.available) dialogSize = 640;
  if (!selected) return <WidgetEmptyState />;

  function inspect(id: string) {
    if (isEditMode) return;
    onSelect(id);
    setDialogHeight(760);
    setDialogId(id);
  }

  let content = (
    <SystemFleet
      snapshots={snapshots}
      width={width}
      height={height}
      options={options}
      isEditMode={isEditMode}
      onInspect={inspect}
      onPreferences={onPreferences}
    />
  );
  if (
    snapshots.length === 1 &&
    !advanced &&
    options.presentation !== "list" &&
    options.presentation !== "history" &&
    options.healthFilter !== "attention"
  )
    content = (
      <SystemTile
        snapshot={selected}
        width={width}
        height={height}
        options={options}
        isEditMode={isEditMode}
        onInspect={() => inspect(selected.system.id)}
        stale={isStaleReading(selected.system.updatedAt, now, selected.system.refreshInterval)}
        standalone
      />
    );
  if (!advanced && options.presentation === "history" && width >= 290 && height >= 210) {
    const attention = snapshots.filter((snapshot) => needsAttention(snapshot, now));
    const attentionOnly = options.healthFilter === "attention";
    let chartSystems = snapshots;
    if (attentionOnly) chartSystems = attention;
    let filterHeight = 0;
    if (attentionOnly || attention.length > 0) filterHeight = coarsePointer ? 44 : 28;
    // When every matching host is unreachable, keep its name and inspect action visible.
    const hasObservations = chartSystems.some(
      ({ available, system }) => available || system.history.some((sample) => !sample.unavailable),
    );
    if (hasObservations)
      content = (
        <Stack p={8} gap={4} h="100%" miw={0} style={{ overflowY: "auto" }}>
          {filterHeight > 0 && (
            <HealthAttentionFilter
              count={attention.length}
              active={attentionOnly}
              height={filterHeight}
              disabled={isEditMode}
              onChange={(healthFilter) => onPreferences({ healthFilter })}
            />
          )}
          <Box flex={1} mih={0}>
            <SystemHistoryComparison
              snapshots={chartSystems}
              systemDisplayName={systemDisplayName}
              width={width - 16}
              height={height - 16 - filterHeight - 4}
              options={options}
              isEditMode={isEditMode}
              onInspect={inspect}
              onPreferences={onPreferences}
            />
          </Box>
        </Stack>
      );
  }
  if (advanced)
    content = (
      <SystemAdvanced
        snapshots={snapshots}
        systemDisplayName={systemDisplayName}
        width={width}
        height={height}
        options={options}
        isEditMode={isEditMode}
        onPreferences={onPreferences}
        onInspect={inspect}
      />
    );

  return (
    <Box className={classes.root}>
      {content}
      <Modal
        opened={Boolean(dialog)}
        onClose={() => setDialogId(null)}
        size={dialogSize}
        centered
        padding={0}
        attributes={{ header: { role: "presentation" } }}
        title={
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" fw={600} truncate>
              {dialog && systemDisplayName(dialog.system)}
            </Text>
            {dialog && systemDisplayName(dialog.system) === dialog.system.name && (
              <Text size="xs" c="dimmed" truncate>
                {getIntegrationName(dialog.system.kind)}
              </Text>
            )}
          </Group>
        }
        closeButtonProps={{ "aria-label": t("closeSystemDetails") }}
        classNames={{ content: healthClasses.root }}
        styles={{
          content: {
            display: "flex",
            flexDirection: "column",
            height: "min(" + dialogHeight + "px, calc(100dvh - 32px))",
            overflow: "hidden",
          },
          header: { flexShrink: 0, padding: "12px 16px" },
          body: { flex: 1, minHeight: 0, padding: 0, overflow: "hidden" },
        }}
      >
        <Box ref={modalBounds.ref} h="100%" mih={0} miw={0}>
          {dialog && (
            <SystemDetail
              snapshot={dialog}
              width={modalBounds.width || Math.min(width, 1040)}
              height={modalBounds.height || Math.min(height, 640)}
              options={options}
              isEditMode={isEditMode}
              onPreferences={onPreferences}
              onPreferredHeight={setDialogHeight}
            />
          )}
        </Box>
      </Modal>
    </Box>
  );
}
