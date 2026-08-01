"use client";

import { useCallback, useMemo } from "react";
import { Box, Button, Center, Loader, Menu, ScrollArea, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { IconQuestionMark, IconServer, IconServerOff } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import { setWidgetRuntimeQueries } from "../definition";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";
import { BeszelStatsView } from "../beszel/_shared/stats-view";
import { createBeszelSystemChoices, resolveBeszelSystemChoice } from "./selection";

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode = "compact",
  boardId,
  itemId,
  setOptions,
  widgetStateRef,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation();
  const {
    data: systemsResult = [],
    isPending: systemsPending,
    error: systemsError,
  } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });

  const systems = useMemo(() => createBeszelSystemChoices(systemsResult), [systemsResult]);
  const selectedSystem = resolveBeszelSystemChoice(systems, options.systemId);
  const selectedValue = selectedSystem?.value ?? "";
  const selectedLabel = selectedSystem?.label;
  const systemExists = selectedSystem !== undefined;
  const includeDocker =
    (displayMode === "advanced" || height >= 380) &&
    (options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork);
  setWidgetRuntimeQueries(
    widgetStateRef,
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
      setOptions({ newOptions: { systemId: value } });
      if (hasChangeAccess && boardId && itemId) {
        saveItemOptions({ boardId, itemId, newOptions: { systemId: value } });
      }
    },
    [setOptions, hasChangeAccess, boardId, itemId, saveItemOptions],
  );

  const handleTimePeriod = useCallback(
    (value: string) => {
      setOptions({ newOptions: { timePeriod: value as BeszelTimePeriod } });
      if (hasChangeAccess && boardId && itemId) {
        saveItemOptions({ boardId, itemId, newOptions: { timePeriod: value } });
      }
    },
    [boardId, hasChangeAccess, itemId, saveItemOptions, setOptions],
  );

  if (systemsError) throw systemsError;
  if (systemsPending)
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );

  if (systems.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <BeszelIntegrationErrorIndicator results={systemsResult} />
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
            onChange={(value) => value && handleSelectSystem(value)}
          />
        </Stack>
      </Center>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 1 }}>
        <BeszelIntegrationErrorIndicator results={systemsResult} />
      </Box>
      <ScrollArea
        h="100%"
        className={classes.beszelStatsContainer}
        style={{ pointerEvents: isEditMode ? "none" : undefined }}
      >
        <Stack gap="md" p="sm">
          {!isEditMode && systems.length > 1 && (
            <Menu position="bottom-start" withArrow shadow="md" withinPortal>
              <Menu.Target>
                <Button
                  variant="default"
                  size="compact-xs"
                  leftSection={<IconServer size={14} />}
                  className={classes.beszelStatsSystemToggle}
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
                    onClick={() => handleSelectSystem(system.value)}
                  >
                    {system.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {!isEditMode && displayMode === "advanced" && (
            <SegmentedControl
              size="xs"
              value={options.timePeriod}
              onChange={handleTimePeriod}
              data={[
                { value: "1m", label: t("period.live") },
                { value: "1h", label: t("period.oneHour") },
                { value: "12h", label: t("period.twelveHours") },
                { value: "24h", label: t("period.oneDay") },
                { value: "1w", label: t("period.oneWeek") },
                { value: "30d", label: t("period.thirtyDays") },
              ]}
            />
          )}
          <BeszelStatsView
            integrationIds={selectedSystem ? [selectedSystem.integrationId] : []}
            systemId={selectedSystem?.systemId ?? ""}
            timePeriod={options.timePeriod as BeszelTimePeriod}
            columns={displayMode === "advanced" || width > 600 ? 2 : 1}
            visibility={{
              cpu: options.showCpu,
              memory: options.showMemory,
              disk: options.showDisk,
              diskIO: options.showDiskIO && (displayMode === "advanced" || height >= 260),
              network: options.showNetwork && (displayMode === "advanced" || height >= 260),
              dockerCpu: options.showDockerCpu && (displayMode === "advanced" || height >= 380),
              dockerMemory: options.showDockerMemory && (displayMode === "advanced" || height >= 380),
              dockerNetwork: options.showDockerNetwork && (displayMode === "advanced" || height >= 380),
            }}
            onSwitchToHistorical={() => handleTimePeriod("1h")}
          />
        </Stack>
      </ScrollArea>
    </Box>
  );
}
