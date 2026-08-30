"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MessageStatus } from "@assistant-ui/react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ChainOfThoughtByIndicesProvider,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SelectionToolbarPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useReducedMotion, useWindowEvent } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowUp,
  IconArrowsMaximize,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconDotsVertical,
  IconFileExport,
  IconLink,
  IconMinus,
  IconPencil,
  IconPlus,
  IconQuote,
  IconRefresh,
  IconSearch,
  IconThumbDown,
  IconThumbUp,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { getAssistantActivityState } from "./assistant-activity-state";
import { Composer, PendingActionBanner, PendingQuestionDock, usePendingActionCopy } from "./assistant-composer";
import type { AssistantConversationControls } from "./assistant-conversation-controls";
import { ProviderMessageInfo } from "./assistant-conversation-context";
import { buildAssistantMessageMarkdown } from "./assistant-conversation-export";
import { AssistantDotMatrix } from "./assistant-dot-matrix";
import { ConversationHistory, downloadAssistantMarkdown } from "./assistant-history";
import {
  AssistantDirectiveEntitiesProvider,
  AssistantMessagePending,
  AssistantTextPart,
  FilePart,
  HiddenMessagePart,
  ImagePart,
  ReasoningPart,
  ReasoningVisibilityContext,
  SentAttachment,
  SourcePart,
  UserTextPart,
} from "./assistant-message-content";
import { assistantMessageGroupBy } from "./assistant-message-grouping";
import { getAssistantTelemetry } from "./assistant-message-metadata";
import { AutoApprovalControl, EmptyThread, ViewRefreshAction } from "./assistant-panel-controls";
import classes from "./assistant-panel.module.css";
import type { AssistantPendingAction } from "./assistant-pending-action";
import { AssistantQuestionPortalProvider } from "./assistant-question-portal";
import { AgentTraceToolGroup, AssistantChainOfThought, ToolPart } from "./assistant-tool-rendering";
import { isEscapeOwnedByNestedOverlay } from "../board/advanced-focus/escape";

export type { AssistantConversationControls } from "./assistant-conversation-controls";

interface AssistantPanelProps extends AssistantConversationControls {
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDismissActivity: () => void;
  activityDismissed: boolean;
  hasVisibleWidget: boolean;
  isRunning: boolean;
  unreadCount: number;
  latestAssistantText: string;
  latestAssistantPartType: string | undefined;
  latestUserText: string;
  latestStatus: MessageStatus | undefined;
  pendingAction: AssistantPendingAction | undefined;
}

const BranchPicker = () => {
  const t = useI18n("assistant");
  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch className={classes.branchPicker}>
      <BranchPickerPrimitive.Previous asChild>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("previousResponse")}>
          <IconChevronLeft size={14} />
        </ActionIcon>
      </BranchPickerPrimitive.Previous>
      <Text size="xs" c="dimmed">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>
      <BranchPickerPrimitive.Next asChild>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("nextResponse")}>
          <IconChevronRight size={14} />
        </ActionIcon>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const AssistantMessageActions = () => {
  const t = useI18n("assistant");
  const aui = useAui();
  const exportMessage = () => {
    const message = aui.message().getState();
    const markdown = buildAssistantMessageMarkdown({
      id: message.id,
      parentId: message.parentId,
      format: "assistant-ui/runtime",
      content: message,
      createdAt: message.createdAt,
    });
    downloadAssistantMarkdown(markdown, `assistant-message-${message.id.slice(0, 8)}.md`);
  };
  return (
    <Box className={classes.messageActions}>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        autohideFloat="single-branch"
        className={classes.messageActionBar}
      >
        <Group gap={2} wrap="nowrap">
          <ProviderMessageInfo />
          <Tooltip label={t("copy")}>
            <ActionBarPrimitive.Copy asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("copy")}>
                <AuiIf condition={(state) => !state.message.isCopied}>
                  <IconCopy size={14} />
                </AuiIf>
                <AuiIf condition={(state) => state.message.isCopied}>
                  <IconCheck size={14} />
                </AuiIf>
              </ActionIcon>
            </ActionBarPrimitive.Copy>
          </Tooltip>
          <Tooltip label={t("regenerate")}>
            <ActionBarPrimitive.Reload asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("regenerate")}>
                <IconRefresh size={14} />
              </ActionIcon>
            </ActionBarPrimitive.Reload>
          </Tooltip>
          <ActionBarMorePrimitive.Root>
            <ActionBarMorePrimitive.Trigger asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("moreActions")}>
                <IconDotsVertical size={14} />
              </ActionIcon>
            </ActionBarMorePrimitive.Trigger>
            <ActionBarMorePrimitive.Content className={classes.messageMoreMenu} sideOffset={4} align="end">
              <ActionBarPrimitive.FeedbackPositive asChild>
                <ActionBarMorePrimitive.Item className={classes.messageMoreItem}>
                  <IconThumbUp size={15} />
                  {t("helpful")}
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.FeedbackPositive>
              <ActionBarPrimitive.FeedbackNegative asChild>
                <ActionBarMorePrimitive.Item className={classes.messageMoreItem}>
                  <IconThumbDown size={15} />
                  {t("notHelpful")}
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.FeedbackNegative>
              <AuiIf condition={(state) => state.thread.capabilities.speech && state.message.speech === undefined}>
                <ActionBarPrimitive.Speak asChild>
                  <ActionBarMorePrimitive.Item className={classes.messageMoreItem}>
                    <IconVolume size={15} />
                    {t("readAloud")}
                  </ActionBarMorePrimitive.Item>
                </ActionBarPrimitive.Speak>
              </AuiIf>
              <AuiIf condition={(state) => state.message.speech !== undefined}>
                <ActionBarPrimitive.StopSpeaking asChild>
                  <ActionBarMorePrimitive.Item className={classes.messageMoreItem}>
                    <IconVolumeOff size={15} />
                    {t("stopReading")}
                  </ActionBarMorePrimitive.Item>
                </ActionBarPrimitive.StopSpeaking>
              </AuiIf>
              <ActionBarMorePrimitive.Separator className={classes.messageMoreSeparator} />
              <ActionBarPrimitive.ExportMarkdown onExport={() => exportMessage()} asChild>
                <ActionBarMorePrimitive.Item className={classes.messageMoreItem}>
                  <IconFileExport size={15} />
                  {t("exportMarkdown")}
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.ExportMarkdown>
            </ActionBarMorePrimitive.Content>
          </ActionBarMorePrimitive.Root>
        </Group>
      </ActionBarPrimitive.Root>
      <BranchPicker />
    </Box>
  );
};

const UserMessageActions = () => {
  const t = useI18n("assistant");
  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className={classes.userActions}>
      <Group gap={2}>
        <Tooltip label={t("copyMessage")}>
          <ActionBarPrimitive.Copy asChild>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("copyMessage")}>
              <IconCopy size={14} />
            </ActionIcon>
          </ActionBarPrimitive.Copy>
        </Tooltip>
        <Tooltip label={t("editMessage")}>
          <ActionBarPrimitive.Edit asChild>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("editMessage")}>
              <IconPencil size={14} />
            </ActionIcon>
          </ActionBarPrimitive.Edit>
        </Tooltip>
      </Group>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer = () => {
  const t = useI18n("assistant");
  const actionT = useI18n("common.action");
  return (
    <ComposerPrimitive.Root className={classes.editComposer}>
      <ComposerPrimitive.Input className={classes.editComposerInput} rows={2} aria-label={t("editMessage")} />
      <Group gap="xs" justify="flex-end">
        <ComposerPrimitive.Cancel asChild>
          <Button size="compact-sm" variant="default">
            {actionT("cancel")}
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="compact-sm">{t("updateMessage")}</Button>
        </ComposerPrimitive.Send>
      </Group>
    </ComposerPrimitive.Root>
  );
};

const UserMessage = () => {
  const isEditing = useAuiState((state) => state.composer.isEditing);
  if (isEditing) return <EditComposer />;
  return (
    <MessagePrimitive.Root className={`${classes.message} ${classes.userMessageWrap}`} data-static>
      <Box className={classes.userMessage}>
        <MessagePrimitive.Quote>
          {(quote) => (
            <Text component="blockquote" className={classes.messageQuote} size="sm">
              {quote.text}
            </Text>
          )}
        </MessagePrimitive.Quote>
        <MessagePrimitive.Attachments components={{ Attachment: SentAttachment }} />
        <MessagePrimitive.Parts
          components={{ Text: UserTextPart, File: HiddenMessagePart, Image: HiddenMessagePart }}
        />
      </Box>
      <Group className={classes.userMessageActions} justify="flex-end" gap="xs" wrap="wrap">
        <UserMessageActions />
        <BranchPicker />
      </Group>
    </MessagePrimitive.Root>
  );
};

const RuntimeError = () => {
  const t = useI18n("assistant");
  const actionT = useI18n("common.action");
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className={classes.messageError}>
        <Group align="flex-start" wrap="nowrap">
          <ThemeIcon color="red" variant="light" radius="xl" size="md">
            <IconAlertTriangle size={17} />
          </ThemeIcon>
          <Stack gap="xs" flex={1}>
            <Text size="sm" fw={700}>
              {t("responseError.title")}
            </Text>
            <ErrorPrimitive.Message className={classes.messageErrorText} />
            <ActionBarPrimitive.Reload asChild>
              <Button
                variant="light"
                color="red"
                size="compact-sm"
                w="fit-content"
                leftSection={<IconRefresh size={14} />}
              >
                {actionT("tryAgain")}
              </Button>
            </ActionBarPrimitive.Reload>
          </Stack>
        </Group>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const WebSearchActivity = () => {
  const t = useI18n("assistant");
  const metadata = useAuiState((state) => state.message.metadata);
  const telemetry = getAssistantTelemetry(metadata);
  if (!telemetry) return null;
  const sources = telemetry.webSearchSources ?? [];
  if (telemetry.webSearchRequests === undefined && sources.length === 0) return null;

  return (
    <Box className={`${classes.tool} ${classes.webSearchActivity}`}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <ThemeIcon size="sm" radius="xl" variant="light" color="blue">
            <IconSearch size={13} />
          </ThemeIcon>
          <div>
            <Text size="sm" fw={600}>
              {t("webSearch.title")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("webSearch.completed")}
            </Text>
          </div>
        </Group>
        <Group gap={4} wrap="wrap" justify="flex-end">
          {telemetry.webSearchRequests !== undefined && (
            <Badge size="xs" variant="light" color="blue">
              {t("webSearch.searches", { count: telemetry.webSearchRequests })}
            </Badge>
          )}
          {sources.length > 0 && (
            <Badge size="xs" variant="light" color="gray">
              {t("webSearch.sources", { count: sources.length })}
            </Badge>
          )}
        </Group>
      </Group>
      {sources.length > 0 && (
        <Group className={classes.webSearchSources} gap="xs" wrap="wrap">
          {sources.map((source) => (
            <Anchor
              key={source.url}
              className={classes.webSearchSource}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              size="xs"
              title={source.title ?? source.url}
            >
              <IconLink size={13} />
              <Text component="span" inherit lineClamp={1}>
                {source.title ?? new URL(source.url).hostname}
              </Text>
            </Anchor>
          ))}
        </Group>
      )}
    </Box>
  );
};

const AssistantMessage = () => {
  const isComplete = useAuiState((state) => state.message.status?.type === "complete");

  return (
    <MessagePrimitive.Root
      className={`${classes.message} ${classes.assistantMessage}`}
      data-static={isComplete || undefined}
    >
      <MessagePrimitive.GroupedParts groupBy={assistantMessageGroupBy} indicator="empty">
        {({ part, children }) => {
          switch (part.type) {
            case "group-agent-trace": {
              const startIndex = part.indices[0];
              const endIndex = part.indices.at(-1);
              if (startIndex === undefined || endIndex === undefined) return null;
              return (
                <ChainOfThoughtByIndicesProvider startIndex={startIndex} endIndex={endIndex}>
                  <AssistantChainOfThought>{children}</AssistantChainOfThought>
                </ChainOfThoughtByIndicesProvider>
              );
            }
            case "group-reasoning":
              return <>{children}</>;
            case "group-tool":
              return <AgentTraceToolGroup>{children}</AgentTraceToolGroup>;
            case "indicator":
              return <AssistantMessagePending status={{ type: "running" }} />;
            case "text":
              return <AssistantTextPart />;
            case "reasoning":
              return <ReasoningPart {...part} />;
            case "tool-call":
              return part.toolUI ?? <ToolPart {...part} />;
            case "source":
              return <SourcePart {...part} />;
            case "file":
              return <FilePart {...part} />;
            case "image":
              return <ImagePart {...part} />;
            case "data":
              return part.dataRendererUI;
            default:
              return null;
          }
        }}
      </MessagePrimitive.GroupedParts>
      <RuntimeError />
      <WebSearchActivity />
      <AssistantMessageActions />
    </MessagePrimitive.Root>
  );
};

const assistantThreadMessageComponents = { UserMessage, AssistantMessage };

const getActivityColor = (needsApproval: boolean, failed: boolean, isRunning: boolean) => {
  if (needsApproval) return "yellow";
  if (failed || isRunning) return "red";
  return "green";
};

const AssistantActivityBar = ({
  isRunning,
  unreadCount,
  latestAssistantText,
  latestAssistantPartType,
  latestUserText,
  latestStatus,
  pendingAction,
  onOpen,
  onDismissActivity,
  activityDismissed,
}: Pick<
  AssistantPanelProps,
  | "isRunning"
  | "unreadCount"
  | "latestAssistantText"
  | "latestAssistantPartType"
  | "latestUserText"
  | "latestStatus"
  | "pendingAction"
  | "onOpen"
  | "onDismissActivity"
  | "activityDismissed"
>) => {
  const t = useI18n("assistant");
  const pendingCopy = usePendingActionCopy(pendingAction);
  const needsApproval = pendingAction !== undefined || latestStatus?.type === "requires-action";
  const failed = latestStatus?.type === "incomplete" && latestStatus.reason !== "cancelled";
  const visible =
    !activityDismissed &&
    (isRunning || unreadCount > 0 || needsApproval || latestStatus !== undefined || latestAssistantText.length > 0);

  if (!visible) return null;

  let title = t("activity.ready");
  if (failed) title = t("activity.failed");
  if (needsApproval) title = t("activity.approval");
  if (pendingCopy) title = pendingCopy.title;
  if (isRunning) title = t("activity.thinking");

  let fallbackDetail = t("activity.completed");
  if (failed) fallbackDetail = t("responseError.description");

  let detail = pendingCopy?.detail || latestAssistantText || fallbackDetail;
  if (isRunning) detail = latestUserText || t("activity.working");
  const activityState = getAssistantActivityState({
    isRunning,
    latestPartType: latestAssistantPartType,
    needsApproval,
    failed,
  });
  const activityColor = getActivityColor(needsApproval, failed, isRunning);

  return (
    <Box component="output" className={classes.activityBar} aria-live="polite">
      <UnstyledButton className={classes.activityTrigger} onClick={onOpen}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" color={activityColor} radius="xl">
            <AssistantDotMatrix state={activityState} label={title} role="presentation" aria-hidden />
          </ThemeIcon>
          <Stack gap={0} className={classes.activityCopy}>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" fw={700}>
                {title}
              </Text>
              {unreadCount > 0 && (
                <Badge size="xs" variant="filled" color="red" circle>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {detail}
            </Text>
          </Stack>
          {needsApproval ? (
            <Box className={classes.activityReviewAction}>
              <Text component="span" size="xs" fw={700}>
                {t("pendingAction.review")}
              </Text>
              <IconChevronUp size={15} />
            </Box>
          ) : (
            <IconChevronUp size={17} className={classes.activityExpandIcon} />
          )}
        </Group>
      </UnstyledButton>
      {!isRunning && !needsApproval && (
        <ActionIcon
          className={classes.activityDismiss}
          variant="subtle"
          color="gray"
          onClick={onDismissActivity}
          aria-label={t("activity.dismiss")}
        >
          <IconX size={15} />
        </ActionIcon>
      )}
    </Box>
  );
};

interface AssistantConversationSurfaceProps extends AssistantConversationControls {
  isRunning: boolean;
  pendingAction: AssistantPendingAction | undefined;
  onExpand?: () => void;
  onMinimize?: () => void;
  onDismiss?: () => void;
}

export const AssistantConversationSurface = ({
  isRunning,
  pendingAction,
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  isRefreshing,
  autoFocusComposer,
  onRefresh,
  onModelChange,
  onReasoningChange,
  onExpand,
  onMinimize,
  onDismiss,
}: AssistantConversationSurfaceProps) => {
  const t = useI18n("assistant");
  const reducedMotion = useReducedMotion();
  const [questionPortalTarget, setQuestionPortalTarget] = useState<HTMLDivElement | null>(null);
  const [reasoningCollapsed, setReasoningCollapsed] = useState(false);
  const reasoningVisibility = useMemo(
    () => ({ collapsed: reasoningCollapsed, setCollapsed: setReasoningCollapsed }),
    [reasoningCollapsed],
  );
  const scrollToLatestBehavior = isRunning || reducedMotion ? "instant" : "smooth";

  return (
    <AssistantDirectiveEntitiesProvider>
      <Group className={classes.panelHeader} justify="space-between" wrap="nowrap" gap="xs">
        <Group className={classes.panelActions} gap={2} wrap="nowrap">
          <ConversationHistory />
          <ViewRefreshAction isRefreshing={isRefreshing} onRefresh={onRefresh} />
          <AutoApprovalControl />
          <Tooltip label={t("newConversation")}>
            <ThreadListPrimitive.New asChild>
              <ActionIcon
                className={classes.panelAction}
                variant="subtle"
                color="gray"
                aria-label={t("newConversation")}
              >
                <IconPlus size={17} />
              </ActionIcon>
            </ThreadListPrimitive.New>
          </Tooltip>
          {onExpand && (
            <Tooltip label={t("activity.expand")}>
              <ActionIcon
                className={classes.panelAction}
                variant="subtle"
                color="gray"
                onClick={onExpand}
                aria-label={t("activity.expand")}
              >
                <IconArrowsMaximize size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          {onMinimize && (
            <Tooltip label={t("minimize")}>
              <ActionIcon
                className={classes.panelAction}
                variant="subtle"
                color="gray"
                onClick={onMinimize}
                aria-label={t("minimize")}
              >
                <IconMinus size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          {onDismiss && (
            <Tooltip label={t("close")}>
              <ActionIcon
                className={classes.panelAction}
                variant="subtle"
                color="gray"
                onClick={onDismiss}
                aria-label={t("close")}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
      <AssistantQuestionPortalProvider target={questionPortalTarget}>
        <ReasoningVisibilityContext.Provider value={reasoningVisibility}>
          <ThreadPrimitive.Root
            className={classes.thread}
            data-pending-question={pendingAction?.kind === "question" || undefined}
          >
            <ThreadPrimitive.Viewport className={classes.viewport} autoScroll>
              <Box className={classes.messages}>
                <EmptyThread />
                <ThreadPrimitive.Messages components={assistantThreadMessageComponents} />
              </Box>
              <SelectionToolbarPrimitive.Root className={classes.selectionToolbar}>
                <SelectionToolbarPrimitive.Quote asChild>
                  <Button variant="filled" color="dark" size="compact-sm" leftSection={<IconQuote size={14} />}>
                    {t("quoteSelection")}
                  </Button>
                </SelectionToolbarPrimitive.Quote>
              </SelectionToolbarPrimitive.Root>
              <ThreadPrimitive.ScrollToBottom behavior={scrollToLatestBehavior} asChild>
                <ActionIcon
                  className={classes.scrollToBottom}
                  variant="default"
                  radius="xl"
                  aria-label={t("scrollToLatest")}
                >
                  <IconArrowUp size={16} style={{ transform: "rotate(180deg)" }} />
                </ActionIcon>
              </ThreadPrimitive.ScrollToBottom>
            </ThreadPrimitive.Viewport>
            <PendingQuestionDock pendingAction={pendingAction} setTarget={setQuestionPortalTarget} />
            <PendingActionBanner pendingAction={pendingAction} />
            <Composer
              modelId={modelId}
              models={models}
              modelOptionsLoading={modelOptionsLoading}
              reasoning={reasoning}
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
              onModelChange={onModelChange}
              onReasoningChange={onReasoningChange}
              autoFocusComposer={autoFocusComposer}
              pendingAction={pendingAction}
            />
          </ThreadPrimitive.Root>
        </ReasoningVisibilityContext.Provider>
      </AssistantQuestionPortalProvider>
    </AssistantDirectiveEntitiesProvider>
  );
};

export const AssistantPanel = ({
  opened,
  onOpen,
  onClose,
  onDismissActivity,
  activityDismissed,
  hasVisibleWidget,
  isRunning,
  unreadCount,
  latestAssistantText,
  latestAssistantPartType,
  latestUserText,
  latestStatus,
  pendingAction,
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  isRefreshing,
  onRefresh,
  onModelChange,
  onReasoningChange,
}: AssistantPanelProps) => {
  const t = useI18n("assistant");
  const aui = useAui();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const stopSpeechWithoutSurface = () => {
    if (hasVisibleWidget) return;
    const thread = aui.thread();
    if (thread.getState().speech !== undefined) thread.stopSpeaking();
  };
  const minimize = () => {
    stopSpeechWithoutSurface();
    onClose();
  };

  useWindowEvent("keydown", (event) => {
    if (
      !opened ||
      event.key !== "Escape" ||
      event.defaultPrevented ||
      event.isComposing ||
      isEscapeOwnedByNestedOverlay(event.target, panelRef.current)
    )
      return;
    event.preventDefault();
    minimize();
  });
  useEffect(() => {
    if (!opened) {
      const rememberOutsideFocus = () => {
        if (document.activeElement instanceof HTMLElement) {
          previousFocusRef.current = document.activeElement;
        }
      };
      rememberOutsideFocus();
      document.addEventListener("focusin", rememberOutsideFocus);
      return () => document.removeEventListener("focusin", rememberOutsideFocus);
    }
    const restoreTarget = previousFocusRef.current;
    return () => {
      restoreTarget?.focus();
      previousFocusRef.current = null;
    };
  }, [opened]);

  return (
    <>
      {!opened && !hasVisibleWidget && (
        <AssistantActivityBar
          onOpen={onOpen}
          onDismissActivity={onDismissActivity}
          activityDismissed={activityDismissed}
          isRunning={isRunning}
          unreadCount={unreadCount}
          latestAssistantText={latestAssistantText}
          latestAssistantPartType={latestAssistantPartType}
          latestUserText={latestUserText}
          latestStatus={latestStatus}
          pendingAction={pendingAction}
        />
      )}
      {opened && (
        <dialog ref={panelRef} className={classes.floatingPanel} aria-label={t("title")} open>
          <AssistantConversationSurface
            isRunning={isRunning}
            pendingAction={pendingAction}
            modelId={modelId}
            models={models}
            modelOptionsLoading={modelOptionsLoading}
            reasoning={reasoning}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            onModelChange={onModelChange}
            onReasoningChange={onReasoningChange}
            autoFocusComposer
            onMinimize={minimize}
            onDismiss={() => {
              stopSpeechWithoutSurface();
              onDismissActivity();
              onClose();
            }}
          />
        </dialog>
      )}
    </>
  );
};
