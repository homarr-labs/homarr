"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { ActionIcon, Box, Center, Group, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconArrowsMinimize, IconRobot } from "@tabler/icons-react";
import { useAui, useAuiState } from "@assistant-ui/react";

import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets";
import { useRequiredBoard } from "@homarr/boards/context";

import classes from "./assistant-panel.module.css";
import { AssistantConversationSurface } from "./assistant-panel";
import { getPendingAssistantAction } from "./assistant-pending-action";
import { useAssistantPreferences, useHomarrAssistant } from "./assistant-context";
import { AssistantComposerSurfaceBoundary } from "./assistant-runtime-provider";

export const AssistantBoardWidget = (props: WidgetComponentProps<"assistant">) => {
  const assistant = useHomarrAssistant();
  const { enabled, setWidgetVisible } = assistant;
  const generatedWidgetId = useId();
  const widgetId = props.itemId ?? generatedWidgetId;
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!enabled || !widget) return;
    const observer = new IntersectionObserver(([entry]) => setWidgetVisible(widgetId, entry?.isIntersecting === true), {
      threshold: 0.15,
    });
    observer.observe(widget);
    return () => {
      observer.disconnect();
      setWidgetVisible(widgetId, false);
    };
  }, [enabled, setWidgetVisible, widgetId]);

  if (!assistant.enabled) {
    return <UnavailableAssistantWidget description={assistant.unavailableDescription} />;
  }

  return (
    <AssistantComposerSurfaceBoundary surfaceId={`assistant-widget-${widgetId}`}>
      <Box ref={widgetRef} w="100%" h="100%">
        <EnabledAssistantBoardWidget {...props} assistantWidgetId={widgetId} />
      </Box>
    </AssistantComposerSurfaceBoundary>
  );
};

const EnabledAssistantBoardWidget = ({
  width,
  height,
  isEditMode,
  assistantWidgetId,
}: WidgetComponentProps<"assistant"> & { assistantWidgetId: string }) => {
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

  if (assistant.opened) {
    return <CompactAssistantWidget onOpen={assistant.close} location="panel" />;
  }

  if (assistant.activeWidgetId !== null && assistant.activeWidgetId !== assistantWidgetId) {
    return <CompactAssistantWidget onOpen={() => assistant.activateWidget(assistantWidgetId)} location="widget" />;
  }

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

const CompactAssistantWidget = ({
  onOpen,
  location = "compact",
}: {
  onOpen: () => void;
  location?: "compact" | "panel" | "widget";
}) => {
  const t = useI18n();
  let title = t("widget.assistant.compact.title");
  let description = t("widget.assistant.compact.description");
  let actionLabel = t("widget.assistant.compact.open");
  let actionIcon = <IconArrowsMaximize size={18} />;

  if (location === "panel") {
    title = t("widget.assistant.compact.openTitle");
    description = t("widget.assistant.compact.openDescription");
    actionLabel = t("widget.assistant.compact.returnToWidget");
    actionIcon = <IconArrowsMinimize size={18} />;
  }
  if (location === "widget") {
    title = t("widget.assistant.compact.otherWidgetTitle");
    description = t("widget.assistant.compact.otherWidgetDescription");
    actionLabel = t("widget.assistant.compact.useHere");
  }

  return (
    <Box className={classes.widgetPanel}>
      <Group className={classes.compactState} justify="space-between" wrap="nowrap" gap="sm">
        <Group wrap="nowrap" gap="xs" miw={0}>
          <ThemeIcon variant="light" radius="xl" size="lg" flex="0 0 auto">
            <IconRobot size={19} />
          </ThemeIcon>
          <Stack className={classes.compactCopy} gap={1}>
            <Text className={classes.compactTitle} size="sm" fw={700} lineClamp={1}>
              {title}
            </Text>
            <Text className={classes.compactDescription} size="xs" c="dimmed" lineClamp={2}>
              {description}
            </Text>
          </Stack>
        </Group>
        <Tooltip label={actionLabel}>
          <ActionIcon variant="light" color="red" size={44} radius="md" onClick={onOpen} aria-label={actionLabel}>
            {actionIcon}
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

const AssistantWidgetState = ({ icon: Icon, title, description, color, children }: AssistantWidgetStateProps) => (
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
