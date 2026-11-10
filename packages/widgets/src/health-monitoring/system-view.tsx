"use client";

import { useMemo, useState } from "react";
import { Box, Group, Modal, Text } from "@mantine/core";

import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { useWidgetNow } from "../common/use-widget-now";
import { WidgetEmptyState } from "../common/empty-state";
import type { HealthOptions } from "./display";
import { isStaleReading } from "./display";
import { projectHealthSystem } from "./model";
import type { HealthSystem } from "./model";
import { SystemDetail } from "./system-detail";
import { SystemAdvanced } from "./system-advanced";
import { SystemFleet } from "./system-fleet";
import { SystemTile } from "./system-tile";
import { useHealthBounds } from "./use-health-bounds";
import classes from "./system-view.module.css";
import healthClasses from "./health-monitoring.module.css";

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
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [dialogHeight, setDialogHeight] = useState(760);
  const modalBounds = useHealthBounds();
  const snapshots = useMemo(
    () => systems.map((system) => projectHealthSystem(system, options.visibleStorageVolumes)),
    [systems, options.visibleStorageVolumes],
  );
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
  if (snapshots.length === 1 && !advanced)
    content = (
      <SystemTile
        snapshot={selected}
        width={width}
        height={height}
        options={options}
        isEditMode={isEditMode}
        onInspect={() => inspect(selected.system.id)}
        stale={isStaleReading(selected.system.updatedAt, now)}
        standalone
      />
    );
  if (advanced)
    content = (
      <SystemAdvanced
        snapshots={snapshots}
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
              {dialog?.system.name}
            </Text>
            {dialog && (
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
