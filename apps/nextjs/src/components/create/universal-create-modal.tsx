"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Group, Stack, Text, TextInput, ThemeIcon, UnstyledButton } from "@mantine/core";
import {
  IconApps,
  IconBox,
  IconCode,
  IconLayoutDashboard,
  IconLayoutGridAdd,
  IconPlugConnected,
  IconSearch,
} from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { GroupPermissionKey } from "@homarr/definitions";
import { createModal, useModalAction } from "@homarr/modals";
import { AddBoardModal } from "@homarr/modals-collection";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import classes from "./universal-create-modal.module.css";
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
  workshop: IconSearch,
  customWidget: IconCode,
} satisfies Record<UniversalCreateActionKey, TablerIcon>;

export const UniversalCreateModal = createModal<UniversalCreateModalProps>(({ actions, innerProps }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useScopedI18n("universalCreate");
  const { openModal: openAddBoardModal } = useModalAction(AddBoardModal);
  const [query, setQuery] = useState("");
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
        router.push("/manage/workshop");
        break;
      case "customWidget":
        router.push("/manage/custom-widgets/new");
        break;
      case "widget":
      case "container":
        break;
    }
  };

  const resolvedActions = definitions.map(
    (definition) =>
      ({
        ...definition,
        name: t(`action.${definition.key}.label`),
        description: t(`action.${definition.key}.description`),
        keywords: t(`action.${definition.key}.keywords`).split(" "),
      }) satisfies RankedUniversalCreateAction,
  );
  const visibleActions = filterAndRankUniversalCreateActions(resolvedActions, query);
  const groups = ["currentBoard", "library", "boards"] satisfies UniversalCreateActionGroup[];

  return (
    <Stack gap="md">
      <TextInput
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
      />

      {visibleActions.length === 0 ? (
        <Text c="dimmed" ta="center" py="lg">
          {t("search.noResults")}
        </Text>
      ) : (
        groups.map((group) => {
          const groupActions = visibleActions.filter((action) => action.group === group);
          if (groupActions.length === 0) return null;

          return (
            <Stack key={group} gap={4}>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase" px="sm">
                {t(`group.${group}`)}
              </Text>
              {groupActions.map((action) => {
                const Icon = actionIcons[action.key];
                return (
                  <UnstyledButton key={action.key} className={classes.action} onClick={() => invokeAction(action.key)}>
                    <Group wrap="nowrap" align="flex-start">
                      <ThemeIcon className={classes.actionIcon} variant="light" radius="md">
                        <Icon size={18} stroke={1.5} />
                      </ThemeIcon>
                      <Stack gap={1}>
                        <Text fw={600} size="sm">
                          {action.name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {action.description}
                        </Text>
                      </Stack>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          );
        })
      )}
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("universalCreate.title"),
  size: "lg",
});
