"use client";

import { ActionIcon, Button, Divider, Group, List, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconAppWindow, IconCheck, IconLayoutDashboard, IconPlugConnected, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName, getWidgetKindsForIntegration } from "@homarr/definitions";
import { createModal, modalSizeForm, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import type { CreatedIntegrationResult } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import {
  getBoardRecipeDismissalKey,
  getBoardRecipeRecommendations,
} from "~/components/board/items/board-recipe-recommendations";
import { useSetupAnalytics } from "~/components/create/setup-analytics";

interface IntegrationCompletionModalProps {
  result: CreatedIntegrationResult;
  boardId?: string;
}

export const IntegrationCompletionModal = createModal<IntegrationCompletionModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const { data: integrations = [] } = clientApi.integration.all.useQuery();
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const trackSetup = useSetupAnalytics();
  const compatibleWidgets = getWidgetKindsForIntegration(innerProps.result.integration.kind);
  const boardMatchesContext = board !== null && board.id === innerProps.boardId;
  const canModifyBoard = boardMatchesContext && constructBoardPermissions(board, session).hasChangeAccess;
  const dismissalKey = getBoardRecipeDismissalKey(
    innerProps.boardId ?? "no-board-context",
    innerProps.result.integration.kind,
  );
  const [recommendationsDismissed, setRecommendationsDismissed] = useLocalStorage({
    key: dismissalKey,
    defaultValue: false,
  });
  const configuredIntegrationKinds = [
    ...new Set<IntegrationKind>([
      ...integrations.map((integration) => integration.kind),
      innerProps.result.integration.kind,
    ]),
  ];
  const recommendations = boardMatchesContext
    ? getBoardRecipeRecommendations({
        configuredIntegrationKinds,
        existingItemKinds: board.items.map((item) => item.kind),
        preferredIntegrationKind: innerProps.result.integration.kind,
      })
    : [];
  const showRecommendations = canModifyBoard && !recommendationsDismissed && recommendations.length > 0;

  const addWidget = () => {
    if (!innerProps.boardId) return;
    actions.closeModal();
    openItemSelectModal({
      boardId: innerProps.boardId,
      initialIntegrationKind: innerProps.result.integration.kind,
    });
  };

  const addRecommendedWidget = (widgetKind: (typeof recommendations)[number]["widgetKind"]) => {
    if (!innerProps.boardId) return;
    trackSetup("completion-recipe-selected", {
      entryPoint: "board",
      intent: "add-compatible-widget",
      outcome: "continued",
      hasBoardContext: true,
    });
    actions.closeModal();
    openItemSelectModal({ boardId: innerProps.boardId, initialWidgetKind: widgetKind });
  };

  return (
    <Stack gap="lg">
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon color="green" variant="light" size="xl" radius="xl">
          <IconCheck size={22} />
        </ThemeIcon>
        <Stack gap={2}>
          <Title order={3} size="h4">
            {t("integration.completion.title", { name: innerProps.result.integration.name })}
          </Title>
          <Text c="dimmed" size="sm">
            {t("integration.completion.description")}
          </Text>
        </Stack>
      </Group>

      <List
        spacing="sm"
        icon={
          <ThemeIcon color="green" size="sm" radius="xl">
            <IconCheck size={12} />
          </ThemeIcon>
        }
      >
        <List.Item>
          <Group gap="xs">
            <IconPlugConnected size={17} />
            <Text size="sm">{t("integration.completion.connectionReady")}</Text>
          </Group>
        </List.Item>
        {innerProps.result.appId && (
          <List.Item>
            <Group gap="xs">
              <IconAppWindow size={17} />
              <Text size="sm">{t("integration.completion.appReady")}</Text>
            </Group>
          </List.Item>
        )}
        <List.Item>
          <Group gap="xs">
            <IconLayoutDashboard size={17} />
            <Text size="sm">
              {t("integration.completion.compatibleWidgets", { count: String(compatibleWidgets.length) })}
            </Text>
          </Group>
        </List.Item>
      </List>

      {showRecommendations && (
        <Stack gap="xs">
          <Divider />
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={600} size="sm">
                {t("integration.completion.recipes.title")}
              </Text>
              <Text c="dimmed" size="xs">
                {t("integration.completion.recipes.description")}
              </Text>
            </div>
            <Tooltip label={t("integration.completion.recipes.dismiss")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t("integration.completion.recipes.dismiss")}
                onClick={() => setRecommendationsDismissed(true)}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          {recommendations.map((recommendation) => (
            <Group key={recommendation.widgetKind} justify="space-between" wrap="nowrap" gap="sm">
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {t(`widget.${recommendation.widgetKind}.name`)}
                </Text>
                <Text c="dimmed" size="xs" truncate>
                  {t(
                    recommendation.isNewlyAvailable
                      ? "integration.completion.recipes.newConnectionReason"
                      : "integration.completion.recipes.existingConnectionReason",
                    {
                      integration: recommendation.isNewlyAvailable
                        ? innerProps.result.integration.name
                        : getIntegrationName(recommendation.integrationKind),
                    },
                  )}
                </Text>
              </Stack>
              <Button variant="light" size="compact-xs" onClick={() => addRecommendedWidget(recommendation.widgetKind)}>
                {t("integration.completion.recipes.add")}
              </Button>
            </Group>
          ))}
        </Stack>
      )}

      <Group justify="end">
        <Button variant="default" onClick={actions.closeModal}>
          {t("common.action.close")}
        </Button>
        {innerProps.boardId && compatibleWidgets.length > 0 && (
          <Button onClick={addWidget}>{t("integration.completion.chooseWidget")}</Button>
        )}
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("integration.completion.modalTitle"),
  size: modalSizeForm,
});
