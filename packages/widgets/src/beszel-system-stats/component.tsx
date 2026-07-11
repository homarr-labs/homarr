"use client";

import { useCallback, useMemo } from "react";
import { Box, Button, Center, Loader, Menu, ScrollArea, Select, Stack, Text } from "@mantine/core";
import { IconQuestionMark, IconServer, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";
import { BeszelStatsView } from "../beszel/_shared/stats-view";

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
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

  const systems = useMemo(
    () => systemsResult.flatMap((result) => result.systems.map((system) => ({ value: system.id, label: system.name }))),
    [systemsResult],
  );
  const selectedSystem = options.systemId || systems[0]?.value || "";
  const selectedLabel = systems.find((system) => system.value === selectedSystem)?.label;
  const systemExists = systems.some((system) => system.value === selectedSystem);

  const handleSelectSystem = useCallback(
    (value: string) => {
      setOptions({ newOptions: { systemId: value } });
      if (hasChangeAccess && boardId && itemId) {
        saveItemOptions({ boardId, itemId, newOptions: { systemId: value } });
      }
    },
    [setOptions, hasChangeAccess, boardId, itemId, saveItemOptions],
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
            value={selectedSystem}
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
                    fw={system.value === selectedSystem ? 600 : 400}
                    c={system.value !== selectedSystem ? "dimmed" : undefined}
                    onClick={() => handleSelectSystem(system.value)}
                  >
                    {system.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          <BeszelStatsView
            integrationIds={integrationIds}
            systemId={selectedSystem}
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
            onSwitchToHistorical={() => setOptions({ newOptions: { timePeriod: "1h" } })}
          />
        </Stack>
      </ScrollArea>
    </Box>
  );
}
