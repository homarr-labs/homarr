"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Center, Divider, Input, ScrollArea, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconApps,
  IconBox,
  IconBuildingStore,
  IconCode,
  IconLayoutDashboard,
  IconLayoutGridAdd,
  IconPlugConnected,
  IconSearch,
} from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { GroupPermissionKey } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { AddBoardModal } from "@homarr/modals-collection";
import { useScopedI18n } from "@homarr/translation/client";
import { SelectableCard } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";

import type {
  RankedUniversalCreateAction,
  UniversalCreateActionGroup,
  UniversalCreateActionKey,
} from "./universal-create-actions";
import { filterAndRankUniversalCreateActions, getUniversalCreateActionDefinitions } from "./universal-create-actions";
import type { SetupMetricEntryPoint } from "./setup-analytics";
import { useSetupAnalytics } from "./setup-analytics";

type BoardActionKey = "widget" | "app" | "integration" | "container";

export interface UniversalCreateModalProps {
  boardActions?: Partial<Record<BoardActionKey, () => void>>;
  entryPoint?: SetupMetricEntryPoint;
}

const actionIcons = {
  widget: IconApps,
  app: IconBox,
  integration: IconPlugConnected,
  container: IconLayoutGridAdd,
  board: IconLayoutDashboard,
  workshop: IconBuildingStore,
  customWidget: IconCode,
} satisfies Record<UniversalCreateActionKey, TablerIcon>;

const groupColors: Record<UniversalCreateActionGroup, string> = {
  currentBoard: "primaryColor",
  library: "cyan",
  boards: "teal",
};

const selectGridCols = { base: 1, sm: 2, md: 3 };

export const UniversalCreateModal = createModal<UniversalCreateModalProps>(({ actions, innerProps }) => {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  const t = useScopedI18n("universalCreate");
  const { openModal: openAddBoardModal } = useModalAction(AddBoardModal);
  const trackedOpen = useRef(false);
  const boardActions = innerProps.boardActions;
  const entryPoint = innerProps.entryPoint ?? (boardActions ? "board" : "header");
  const trackSetup = useSetupAnalytics();
  const permissions = (session?.user.permissions ?? []) as GroupPermissionKey[];
  const definitions = getUniversalCreateActionDefinitions({
    hasBoardContext: boardActions !== undefined,
    permissions,
  });

  useEffect(() => {
    if (trackedOpen.current) return;
    trackedOpen.current = true;
    trackSetup("surface-opened", {
      entryPoint,
      hasBoardContext: boardActions !== undefined,
    });
  }, [boardActions, entryPoint, trackSetup]);

  const invokeAction = (key: UniversalCreateActionKey) => {
    const boardAction = key in (boardActions ?? {}) ? boardActions?.[key as BoardActionKey] : undefined;
    actions.closeModal();
    trackSetup("intent-selected", {
      entryPoint,
      intent: key,
      outcome: "continued",
      hasBoardContext: boardActions !== undefined,
    });

    if (boardAction) {
      boardAction();
      return;
    }

    switch (key) {
      case "app":
        router.push("/manage/apps/new");
        break;
      case "integration":
        router.push("/manage/integrations/new");
        break;
      case "board":
        openAddBoardModal(undefined);
        break;
      case "workshop":
        router.push("/manage/custom-widgets/workshop");
        break;
      case "customWidget":
        router.push("/manage/custom-widgets/new");
        break;
      case "widget":
      case "container":
        break;
    }
  };

  const resolvedActions = useMemo(
    () =>
      definitions.map(
        (definition) =>
          ({
            ...definition,
            name: t(`action.${definition.key}.label`),
            description: t(`action.${definition.key}.description`),
            keywords: t(`action.${definition.key}.keywords`).split(" "),
          }) satisfies RankedUniversalCreateAction,
      ),
    [definitions, t],
  );

  const filteredActions = useMemo(
    () => filterAndRankUniversalCreateActions(resolvedActions, search),
    [resolvedActions, search],
  );

  const isSearching = search.trim().length > 0;
  const groups = ["currentBoard", "library", "boards"] satisfies UniversalCreateActionGroup[];

  return (
    <Stack gap="md">
      {/* Top Search Input */}
      <Input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        data-autofocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredActions.length === 1 && filteredActions[0]) {
            invokeAction(filteredActions[0].key);
          }
        }}
      />

      {/* Action Cards Grid */}
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="md" pt="xs" pr="xs" px={4}>
          {isSearching ? (
            <SimpleGrid cols={selectGridCols} spacing="sm">
              {filteredActions.map((action) => {
                const Icon = actionIcons[action.key];
                return (
                  <SelectableCard
                    key={action.key}
                    onClick={() => invokeAction(action.key)}
                    aria-label={action.name}
                    icon={
                      <ThemeIcon size={34} radius="md" variant="light" color={groupColors[action.group]}>
                        <Icon size={20} />
                      </ThemeIcon>
                    }
                    title={action.name}
                    topRight={
                      <Badge variant="dot" color={groupColors[action.group]} size="xs">
                        {t(`group.${action.group}`)}
                      </Badge>
                    }
                    description={action.description}
                  />
                );
              })}
            </SimpleGrid>
          ) : (
            groups.map((group) => {
              const groupActions = resolvedActions
                .filter((action) => action.group === group)
                .toSorted((left, right) => right.priority - left.priority);
              if (groupActions.length === 0) return null;

              return (
                <Stack key={group} gap="xs">
                  <Divider
                    label={
                      <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                        {t(`group.${group}`)}
                      </Text>
                    }
                    labelPosition="left"
                  />
                  <SimpleGrid cols={selectGridCols} spacing="sm">
                    {groupActions.map((action) => {
                      const Icon = actionIcons[action.key];
                      return (
                        <SelectableCard
                          key={action.key}
                          onClick={() => invokeAction(action.key)}
                          aria-label={action.name}
                          icon={
                            <ThemeIcon size={34} radius="md" variant="light" color={groupColors[action.group]}>
                              <Icon size={20} />
                            </ThemeIcon>
                          }
                          title={action.name}
                          topRight={
                            <Badge variant="dot" color={groupColors[action.group]} size="xs">
                              {t(`group.${action.group}`)}
                            </Badge>
                          }
                          description={action.description}
                        />
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              );
            })
          )}

          {filteredActions.length === 0 && (
            <Center p="xl">
              <Text c="dimmed">{t("search.noResults")}</Text>
            </Center>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("universalCreate.title"),
  size: modalSizeSelect,
});
