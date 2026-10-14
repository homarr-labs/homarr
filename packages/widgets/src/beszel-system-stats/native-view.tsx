"use client";

import type { ComponentProps, ReactNode } from "react";
import { ActionIcon, Box, Button, Center, Group, Menu, ScrollArea, Select, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconAdjustments, IconCheck, IconQuestionMark, IconServer, IconServerOff } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import classes from "./component.module.css";

import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import type { BeszelStatsView } from "../beszel/_shared/stats-view";
import type { createBeszelSystemChoices } from "./selection";
import { resolveBeszelSystemChoice } from "./selection";

export interface NativeBeszelSystemStatsViewProps {
  options: WidgetComponentProps<"beszelSystemStats">["options"];
  isEditMode: boolean;
  width: number;
  height: number;
  displayScale?: number;
  displayMode: WidgetComponentProps<"beszelSystemStats">["displayMode"];
  systems: ReturnType<typeof createBeszelSystemChoices>;
  systemsPending: boolean;
  isSelectionSavePending: boolean;
  queryIndicators: ReactNode;
  handleSelectSystem: (value: string) => void;
  handleTimePeriod: (value: BeszelTimePeriod) => void;
  renderStats: (props: ComponentProps<typeof BeszelStatsView>) => ReactNode;
  timePeriod: BeszelTimePeriod;
}

export function NativeBeszelSystemStatsView({
  options,
  isEditMode,
  width,
  height,
  displayScale = 1,
  displayMode,
  systems,
  systemsPending,
  isSelectionSavePending,
  queryIndicators,
  handleSelectSystem,
  handleTimePeriod,
  renderStats,
  timePeriod,
}: NativeBeszelSystemStatsViewProps) {
  const { ref: viewportRef, height: viewportHeight } = useElementSize<HTMLDivElement>();
  const t = useI18n("widget.beszelSystemStats");
  const tBeszel = useI18n("widget.beszel");
  const selectedSystem = resolveBeszelSystemChoice(systems, options.systemId);
  const selectedValue = selectedSystem?.value ?? "";
  const selectedLabel = selectedSystem?.label;
  const systemExists = selectedSystem !== undefined;
  const periodOptions: { value: BeszelTimePeriod; label: string }[] = [
    { value: "1m", label: t("period.live") },
    { value: "1h", label: t("period.oneHour") },
    { value: "12h", label: t("period.twelveHours") },
    { value: "24h", label: t("period.oneDay") },
    { value: "1w", label: t("period.oneWeek") },
    { value: "30d", label: t("period.thirtyDays") },
  ];
  let layoutScale = 1;
  if (displayMode !== "advanced" && Number.isFinite(displayScale) && displayScale > 0) {
    layoutScale = displayScale;
  }
  let responsiveWidth = width;
  let responsiveHeight = height;
  responsiveWidth *= layoutScale;
  responsiveHeight *= layoutScale;

  if (systemsPending) return <WidgetQueryLoadingState />;

  if (systems.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 1 }}>
          {queryIndicators}
        </Group>
        <Center h="100%">
          <Stack align="center" gap="xs">
            <IconServerOff style={zoomCompensatedSize(28)} opacity={0.5} />
            <Text size="sm" c="dimmed">
              {tBeszel("empty.noSystems")}
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (!systemExists) {
    return (
      <Center h="100%">
        <Stack align="center" gap="sm" p="md">
          <IconQuestionMark style={zoomCompensatedSize(40)} />
          <Text size="sm" c="dimmed" ta="center">
            {t("error.systemNotFound")}
          </Text>
          <Select
            size="xs"
            data={systems}
            value={selectedValue}
            placeholder={t("selectSystem")}
            disabled={isSelectionSavePending}
            onChange={(value) => value && handleSelectSystem(value)}
          />
        </Stack>
      </Center>
    );
  }

  return (
    <Box h="100%" pos="relative" className={classes.beszelStatsRoot}>
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 1 }}>
        <Group gap={0}>{queryIndicators}</Group>
      </Box>
      {!isEditMode && (
        <Box className={classes.beszelStatsTouchControls}>
          <Menu position="bottom-end" shadow="md" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={`${t("option.systemId.label")}, ${t("option.timePeriod.label")}`}
              >
                <IconAdjustments style={iconSizes.sm} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {systems.length > 1 && (
                <>
                  <Menu.Label>{t("option.systemId.label")}</Menu.Label>
                  {systems.map((system) => (
                    <Menu.Item
                      key={system.value}
                      leftSection={system.value === selectedValue && <IconCheck style={iconSizes.sm} />}
                      disabled={isSelectionSavePending}
                      onClick={() => handleSelectSystem(system.value)}
                    >
                      {system.label}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                </>
              )}
              <Menu.Label>{t("option.timePeriod.label")}</Menu.Label>
              {periodOptions.map((period) => (
                <Menu.Item
                  key={period.value}
                  leftSection={period.value === options.timePeriod && <IconCheck style={iconSizes.sm} />}
                  disabled={isSelectionSavePending}
                  onClick={() => handleTimePeriod(period.value)}
                >
                  {period.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Box>
      )}
      {!isEditMode && (
        <Group gap="xs" wrap="nowrap" className={classes.beszelStatsControls}>
          {systems.length > 1 && (
            <Menu position="bottom-start" withArrow shadow="md" withinPortal>
              <Menu.Target>
                <Button
                  variant="default"
                  size="compact-xs"
                  leftSection={<IconServer style={iconSizes.sm} />}
                  className={classes.beszelStatsSystemToggle}
                  disabled={isSelectionSavePending}
                >
                  {selectedLabel}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {systems.map((system) => (
                  <Menu.Item
                    key={system.value}
                    fz="xs"
                    fw={system.value === selectedValue ? 600 : 400}
                    c={system.value !== selectedValue ? "dimmed" : undefined}
                    disabled={isSelectionSavePending}
                    onClick={() => handleSelectSystem(system.value)}
                  >
                    {system.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {responsiveWidth >= 560 ? (
            <Button.Group className={classes.beszelStatsPeriodToggle}>
              {periodOptions.map((period) => (
                <Button
                  key={period.value}
                  size="compact-xs"
                  variant={period.value === options.timePeriod ? "filled" : "default"}
                  className={classes.beszelStatsPeriodButton}
                  aria-pressed={period.value === options.timePeriod}
                  disabled={isSelectionSavePending}
                  onClick={() => handleTimePeriod(period.value)}
                >
                  {period.label}
                </Button>
              ))}
            </Button.Group>
          ) : (
            <Select
              size="xs"
              value={options.timePeriod}
              onChange={(value) => {
                const period = periodOptions.find((candidate) => candidate.value === value);
                if (period) handleTimePeriod(period.value);
              }}
              disabled={isSelectionSavePending}
              data={periodOptions}
              className={classes.beszelStatsPeriodToggle}
            />
          )}
        </Group>
      )}
      <ScrollArea
        h="100%"
        scrollbars="y"
        viewportRef={viewportRef}
        className={classes.beszelStatsContainer}
        style={{ pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Stack gap={0}>
          {renderStats({
            showXAxis: responsiveWidth >= 220 && responsiveHeight >= 180,
            integrationIds: selectedSystem ? [selectedSystem.integrationId] : [],
            systemId: selectedSystem?.systemId ?? "",
            timePeriod,
            columns: responsiveWidth > 600 ? 2 : 1,
            availableHeight: Math.floor(viewportHeight || height),
            visibility: {
              cpu: options.showCpu,
              memory: options.showMemory,
              disk: options.showDisk,
              diskIO: options.showDiskIO,
              network: options.showNetwork,
              gpuUsage: options.showGpuUsage,
              gpuMemory: options.showGpuMemory,
              gpuPower: options.showGpuPower,
              dockerCpu: options.showDockerCpu,
              dockerMemory: options.showDockerMemory,
              dockerNetwork: options.showDockerNetwork,
            },
            onSwitchToHistorical: () => handleTimePeriod("1h"),
          })}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
