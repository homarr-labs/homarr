"use client";

import type { CSSProperties, ReactNode } from "react";
import { ActionIcon, Box, Center, Group, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconRobot } from "@tabler/icons-react";
import { useAui, useAuiState } from "@assistant-ui/react";

import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets";
import { useRequiredBoard } from "@homarr/boards/context";

import classes from "./assistant-panel.module.css";
import { AssistantConversationSurface } from "./assistant-panel";
import { getPendingAssistantAction } from "./assistant-pending-action";
import { useAssistantPreferences, useHomarrAssistant } from "./assistant-context";
import { AssistantComposerSurfaceProvider } from "./assistant-runtime-provider";

export const AssistantBoardWidget = (props: WidgetComponentProps<"assistant">) => {
  const assistant = useHomarrAssistant();

  if (!assistant.enabled) {
    return <UnavailableAssistantWidget description={assistant.unavailableDescription} />;
  }

  return (
    <AssistantComposerSurfaceProvider surfaceId={`board-widget-${props.itemId ?? "preview"}`}>
      <EnabledAssistantBoardWidget {...props} />
    </AssistantComposerSurfaceProvider>
  );
};

const EnabledAssistantBoardWidget = ({ width, height, isEditMode }: WidgetComponentProps<"assistant">) => {
  const board = useRequiredBoard();
  const assistant = useHomarrAssistant();
  const preferences = useAssistantPreferences();
  const aui = useAui();
  const messages = useAuiState((state) => state.thread.messages);
  const isLoading = useAuiState((state) => state.thread.isLoading);
  const latestAssistantMessage = messages.findLast((message) => message.role === "assistant");
  const pendingAction = getPendingAssistantAction(latestAssistantMessage);
  const selectModel = (modelId: string) => {
    preferences.setModelId(modelId);
    const threadListItem = aui.threadListItem();
    if (!threadListItem.getState().remoteId) return;
    threadListItem.updateCustom({ ...threadListItem.getState().custom, modelId });
  };

  if (width < 300 || height < 280) {
    return <CompactAssistantWidget onOpen={assistant.open} />;
  }

  return (
    <Box
      className={classes.widgetPanel}
      data-board-widget
      data-compact={width < 420 || height < 420 || undefined}
      data-editing={isEditMode || undefined}
      aria-busy={isLoading || assistant.isRunning}
      style={{ "--assistant-widget-radius": `var(--mantine-radius-${board.itemRadius})` } as CSSProperties}
    >
      <AssistantConversationSurface
        isRunning={assistant.isRunning}
        pendingAction={pendingAction}
        modelId={preferences.modelId}
        models={preferences.models}
        modelOptionsLoading={preferences.isLoading}
        reasoning={preferences.reasoning}
        isRefreshing={assistant.isRefreshing}
        onRefresh={assistant.refreshCurrentView}
        onModelChange={selectModel}
        onReasoningChange={preferences.setReasoning}
        onExpand={assistant.open}
      />
    </Box>
  );
};

const CompactAssistantWidget = ({ onOpen }: { onOpen: () => void }) => {
  const t = useI18n();

  return (
    <Box className={classes.widgetPanel}>
      <Group className={classes.compactState} justify="space-between" wrap="nowrap" gap="sm">
        <Group wrap="nowrap" gap="xs" miw={0}>
          <ThemeIcon variant="light" color="red" radius="xl" size="lg" flex="0 0 auto">
            <IconRobot size={19} />
          </ThemeIcon>
          <Stack className={classes.compactCopy} gap={1}>
            <Text className={classes.compactTitle} size="sm" fw={700} lineClamp={1}>
              {t("widget.assistant.compact.title")}
            </Text>
            <Text className={classes.compactDescription} size="xs" c="dimmed" lineClamp={2}>
              {t("widget.assistant.compact.description")}
            </Text>
          </Stack>
        </Group>
        <Tooltip label={t("widget.assistant.compact.open")}>
          <ActionIcon
            variant="light"
            color="red"
            size={44}
            radius="md"
            onClick={onOpen}
            aria-label={t("widget.assistant.compact.open")}
          >
            <IconArrowsMaximize size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
};

interface AssistantWidgetStateProps {
  icon: typeof IconRobot;
  title: string;
  description: string;
  color?: string;
  children?: ReactNode;
}

const AssistantWidgetState = ({
  icon: Icon,
  title,
  description,
  color = "red",
  children,
}: AssistantWidgetStateProps) => (
  <Center className={classes.widgetState} h="100%" p="md">
    <Stack align="center" gap="sm" ta="center" maw={360}>
      <ThemeIcon variant="light" color={color} radius="xl" size="xl">
        <Icon size={24} />
      </ThemeIcon>
      <Stack gap={3} align="center">
        <Text fw={700}>{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
      {children}
    </Stack>
  </Center>
);

const UnavailableAssistantWidget = ({ description }: { description: string | null }) => {
  const t = useI18n();
  return (
    <AssistantWidgetState
      icon={IconRobot}
      title={t("widget.assistant.unavailable.title")}
      description={description ?? t("widget.assistant.unavailable.description")}
    />
  );
};
