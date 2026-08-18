"use client";

import { useCallback, useMemo, useRef } from "react";
import { Box, Button, Center, Group, Loader, Menu, ScrollArea, Select, Stack, Text } from "@mantine/core";
import { IconQuestionMark, IconServer, IconServerOff } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { BeszelStatsView } from "../beszel/_shared/stats-view";
import { createBeszelSystemChoices, resolveBeszelSystemChoice } from "./selection";

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
  widgetRuntimeRef,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const selectionSavePendingRef = useRef(false);
  const { mutate: saveItemOptions, isPending: isSelectionSavePending } =
    clientApi.widget.options.saveItemOptions.useMutation({
      onError: () =>
        showErrorNotification({
          title: t("error.selectionSaveTitle"),
          message: t("error.selectionSaveMessage"),
        }),
    });
  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const systemsData = getUsableWidgetQueryData(systemsQuery);
  const systemsResult = useMemo(() => systemsData ?? [], [systemsData]);
  const { isPending: systemsPending } = systemsQuery;

  const systems = useMemo(() => createBeszelSystemChoices(systemsResult), [systemsResult]);
  const selectedSystem = resolveBeszelSystemChoice(systems, options.systemId);
  const selectedValue = selectedSystem?.value ?? "";
  const selectedLabel = selectedSystem?.label;
  const systemExists = selectedSystem !== undefined;
  const includeDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;
  const periodOptions = [
    { value: "1m", label: t("period.live") },
    { value: "1h", label: t("period.oneHour") },
    { value: "12h", label: t("period.twelveHours") },
    { value: "24h", label: t("period.oneDay") },
    { value: "1w", label: t("period.oneWeek") },
    { value: "30d", label: t("period.thirtyDays") },
  ];
  useWidgetRuntimeQueries(
    widgetRuntimeRef,
    selectedSystem && options.timePeriod !== "1m"
      ? [
          getQueryKey(
            clientApi.widget.beszel.getSystemStats,
            {
              integrationIds: [selectedSystem.integrationId],
              systemId: selectedSystem.systemId,
              timePeriod: options.timePeriod as BeszelTimePeriod,
              includeDocker,
            },
            "query",
          ),
        ]
      : [],
  );

  const handleSelectSystem = useCallback(
    (value: string) => {
      if (selectionSavePendingRef.current) return;

      const previousValue = options.systemId;
      setOptions({ newOptions: { systemId: value } });
      if (hasChangeAccess && boardId && itemId) {
        selectionSavePendingRef.current = true;
        saveItemOptions(
          { boardId, itemId, newOptions: { systemId: value } },
          {
            onError: () => {
              setOptions({ newOptions: { systemId: previousValue } });
            },
            onSettled: () => {
              selectionSavePendingRef.current = false;
            },
          },
        );
      }
    },
    [boardId, hasChangeAccess, itemId, options.systemId, saveItemOptions, setOptions],
  );

  const handleTimePeriod = useCallback(
    (value: string) => {
      if (selectionSavePendingRef.current) return;

      const timePeriod = value as BeszelTimePeriod;
      const previousValue = options.timePeriod;
      setOptions({ newOptions: { timePeriod } });
      if (hasChangeAccess && boardId && itemId) {
        selectionSavePendingRef.current = true;
        saveItemOptions(
          { boardId, itemId, newOptions: { timePeriod } },
          {
            onError: () => {
              setOptions({ newOptions: { timePeriod: previousValue } });
            },
            onSettled: () => {
              selectionSavePendingRef.current = false;
            },
          },
        );
      }
    },
    [boardId, hasChangeAccess, itemId, options.timePeriod, saveItemOptions, setOptions],
  );

  if (systemsPending)
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );

  if (systems.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 1 }}>
          <WidgetQueryErrorIndicator error={systemsQuery.error} label={t("name")} />
          <IntegrationErrorIndicator results={systemsResult} />
        </Group>
        <Center h="100%">
          <Stack align="center" gap="xs">
            <IconServerOff size={28} opacity={0.5} />
            <Text size="sm" c="dimmed">
              {t("empty.noSystems")}
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
          <IconQuestionMark size={40} />
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
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 1 }}>
        <Group gap={0}>
          <WidgetQueryErrorIndicator error={systemsQuery.error} label={t("name")} />
          <IntegrationErrorIndicator results={systemsResult} />
        </Group>
      </Box>
      <ScrollArea
        h="100%"
        className={classes.beszelStatsContainer}
        style={{ pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Stack gap="md" p="sm">
          {!isEditMode && (
            <Group gap="xs" wrap="nowrap" className={classes.beszelStatsControls}>
              {systems.length > 1 && (
                <Menu position="bottom-start" withArrow shadow="md" withinPortal>
                  <Menu.Target>
                    <Button
                      variant="default"
                      size="compact-xs"
                      leftSection={<IconServer size="var(--mantine-font-size-sm)" />}
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
              {width >= 560 ? (
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
                  onChange={(value) => value && handleTimePeriod(value)}
                  disabled={isSelectionSavePending}
                  data={periodOptions}
                  className={classes.beszelStatsPeriodToggle}
                />
              )}
            </Group>
          )}
          <BeszelStatsView
            integrationIds={selectedSystem ? [selectedSystem.integrationId] : []}
            systemId={selectedSystem?.systemId ?? ""}
            timePeriod={options.timePeriod as BeszelTimePeriod}
            columns={width > 600 ? 2 : 1}
            visibility={{
              cpu: options.showCpu,
              memory: options.showMemory,
              disk: options.showDisk,
              diskIO: options.showDiskIO,
              network: options.showNetwork,
              dockerCpu: options.showDockerCpu,
              dockerMemory: options.showDockerMemory,
              dockerNetwork: options.showDockerNetwork,
            }}
            onSwitchToHistorical={() => handleTimePeriod("1h")}
          />
        </Stack>
      </ScrollArea>
    </Box>
  );
}
