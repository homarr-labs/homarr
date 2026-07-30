"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  FileMessagePartProps,
  ImageMessagePartProps,
  ReasoningMessagePartProps,
  SourceMessagePartProps,
  ToolCallMessagePartProps,
  Unstable_TriggerItem,
} from "@assistant-ui/react";
import type { MessageStatus } from "@assistant-ui/react";
import {
  ActionBarPrimitive,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  SelectionToolbarPrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
} from "@assistant-ui/react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  FocusTrap,
  Group,
  Loader,
  Popover,
  Progress,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconApps,
  IconArrowUp,
  IconAt,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconDownload,
  IconCommand,
  IconFile,
  IconFileExport,
  IconLink,
  IconMessage,
  IconMicrophone,
  IconPaperclip,
  IconPencil,
  IconHistory,
  IconPlayerStop,
  IconPlus,
  IconQuote,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconSpeakerphone,
  IconThumbDown,
  IconThumbUp,
  IconTool,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { getAssistantTelemetry, getAssistantUsage } from "./assistant-message-metadata";

interface AssistantPanelProps {
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  onMarkRead: () => void;
  isRunning: boolean;
  unreadCount: number;
  latestAssistantText: string;
  latestUserText: string;
  latestStatus: MessageStatus | undefined;
}

const TextPart = () => <MessagePartPrimitive.Text className={classes.messageText} />;

const Attachment = ({ removable = false }: { removable?: boolean }) => {
  const t = useScopedI18n("common.assistant");
  return (
    <AttachmentPrimitive.Root className={classes.attachment}>
      <AttachmentPrimitive.unstable_Thumb className={classes.attachmentThumb} />
      <Text size="xs" lineClamp={1} className={classes.attachmentName}>
        <AttachmentPrimitive.Name />
      </Text>
      {removable && (
        <AttachmentPrimitive.Remove asChild>
          <ActionIcon variant="subtle" color="gray" size="xs" aria-label={t("removeAttachment")}>
            <IconX size={12} />
          </ActionIcon>
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
};
const SentAttachment = () => <Attachment />;

const ReasoningPart = ({ text, status }: ReasoningMessagePartProps) => {
  const t = useScopedI18n("common.assistant");
  return (
    <details className={classes.reasoning} open={status.type === "running"}>
      <summary>
        <Group gap="xs" wrap="nowrap">
          <Loader type="bars" size="xs" color="gray" style={{ opacity: status.type === "running" ? 1 : 0 }} />
          <Text size="xs" fw={600} c="dimmed">
            {t("reasoning")}
          </Text>
        </Group>
      </summary>
      <Text size="sm" c="dimmed" className={classes.reasoningText}>
        {text}
      </Text>
    </details>
  );
};

const SourcePart = (source: SourceMessagePartProps) => (
  <Anchor
    className={classes.source}
    href={source.url}
    target={source.url ? "_blank" : undefined}
    rel={source.url ? "noreferrer" : undefined}
    size="xs"
  >
    <IconLink size={13} />
    {source.title}
  </Anchor>
);

const FilePart = ({ data, filename, mimeType }: FileMessagePartProps) => {
  const t = useScopedI18n("common.assistant");
  const downloadable = data.startsWith("data:");
  const displayName = filename ?? mimeType;
  return (
    <Group className={classes.messageFile} gap="xs" wrap="nowrap">
      <IconFile size={16} />
      <Text size="xs" lineClamp={1} flex={1}>
        {displayName}
      </Text>
      {downloadable && (
        <ActionIcon
          component="a"
          href={data}
          download={filename ?? "assistant-file"}
          variant="subtle"
          color="gray"
          size="xs"
          aria-label={t("downloadFile", { name: displayName })}
        >
          <IconDownload size={13} />
        </ActionIcon>
      )}
    </Group>
  );
};

const ImagePart = ({ image, filename }: ImageMessagePartProps) => {
  const t = useScopedI18n("common.assistant");
  const source = (() => {
    if (/^data:image\/(?:gif|jpeg|png|webp);base64,/u.test(image)) return image;
    try {
      const url = new URL(image, window.location.origin);
      return url.origin === window.location.origin ? url.href : null;
    } catch {
      return null;
    }
  })();
  if (!source) {
    return (
      <Group className={classes.messageFile} gap="xs" wrap="nowrap">
        <IconAlertTriangle size={16} />
        <Text size="xs">{t("externalImageBlocked")}</Text>
      </Group>
    );
  }
  return <Box component="img" src={source} alt={filename ?? t("attachedImage")} className={classes.messageImage} />;
};

const ToolPart = ({
  toolName,
  args,
  result,
  isError,
  status,
  approval,
  respondToApproval,
  timing,
}: ToolCallMessagePartProps) => {
  const t = useScopedI18n("common.assistant");
  const [opened, setOpened] = useState(false);
  const completed = status?.type === "complete";
  const awaitingApproval = approval !== undefined && approval.approved === undefined && !approval.resolution;
  const denied = approval?.approved === false;
  const failed =
    !denied &&
    (isError === true ||
      status?.type === "incomplete" ||
      (typeof result === "object" && result !== null && "error" in result));
  const successful = completed && !denied && !failed;
  const duration = timing?.completedAt !== undefined ? Math.max(0, timing.completedAt - timing.startedAt) : undefined;
  return (
    <Box className={classes.tool}>
      <UnstyledButton
        className={classes.toolHeader}
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened || awaitingApproval}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size="sm"
              radius="xl"
              variant="light"
              color={denied || failed ? "red" : successful ? "green" : "gray"}
            >
              {denied || failed ? <IconX size={13} /> : successful ? <IconCheck size={13} /> : <IconRobot size={13} />}
            </ThemeIcon>
            <Text size="sm" fw={600}>
              {toolName.replaceAll("_", " ")}
            </Text>
          </Group>
          <Group gap={6} wrap="nowrap">
            {duration !== undefined && (
              <Text size="xs" c="dimmed">
                {duration < 1000 ? `${duration} ms` : `${(duration / 1000).toFixed(1)} s`}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {awaitingApproval
                ? t("approvalRequired")
                : denied
                  ? t("denied")
                  : failed
                    ? t("failed")
                    : successful
                      ? t("complete")
                      : t("working")}
            </Text>
            <IconChevronDown
              size={14}
              className={classes.disclosureIcon}
              data-opened={opened || awaitingApproval || undefined}
            />
          </Group>
        </Group>
      </UnstyledButton>
      {awaitingApproval && (
        <Stack gap="xs" mt="sm">
          <Text size="sm">{t("approvalDescription")}</Text>
          <Group gap="xs">
            <Button size="compact-sm" onClick={() => respondToApproval({ approved: true })}>
              {t("allowOnce")}
            </Button>
            <Button size="compact-sm" variant="default" onClick={() => respondToApproval({ approved: false })}>
              {t("deny")}
            </Button>
          </Group>
        </Stack>
      )}
      <Collapse expanded={opened || awaitingApproval}>
        <Stack gap="xs" mt="sm">
          <Box>
            <Text size="xs" fw={600} c="dimmed">
              {t("toolInput")}
            </Text>
            <Text className={classes.codeBlock} size="xs" component="pre">
              {JSON.stringify(args, null, 2)}
            </Text>
          </Box>
          {!denied && result !== undefined && (
            <Box>
              <Text size="xs" fw={600} c="dimmed">
                {t("toolOutput")}
              </Text>
              <Text className={classes.codeBlock} size="xs" component="pre">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </Text>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

const BranchPicker = () => {
  const t = useScopedI18n("common.assistant");
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
  const t = useScopedI18n("common.assistant");
  return (
    <Group className={classes.messageActions} gap="xs" justify="space-between">
      <BranchPicker />
      <ActionBarPrimitive.Root hideWhenRunning>
        <Group gap={2}>
          <Tooltip label={t("copy")}>
            <ActionBarPrimitive.Copy asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("copy")}>
                <IconCopy size={14} />
              </ActionIcon>
            </ActionBarPrimitive.Copy>
          </Tooltip>
          <Tooltip label={t("speak")}>
            <ActionBarPrimitive.Speak asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("speak")}>
                <IconSpeakerphone size={14} />
              </ActionIcon>
            </ActionBarPrimitive.Speak>
          </Tooltip>
          <Tooltip label={t("stopSpeaking")}>
            <ActionBarPrimitive.StopSpeaking asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("stopSpeaking")}>
                <IconPlayerStop size={14} />
              </ActionIcon>
            </ActionBarPrimitive.StopSpeaking>
          </Tooltip>
          <Tooltip label={t("helpful")}>
            <ActionBarPrimitive.FeedbackPositive asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("helpful")}>
                <IconThumbUp size={14} />
              </ActionIcon>
            </ActionBarPrimitive.FeedbackPositive>
          </Tooltip>
          <Tooltip label={t("notHelpful")}>
            <ActionBarPrimitive.FeedbackNegative asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("notHelpful")}>
                <IconThumbDown size={14} />
              </ActionIcon>
            </ActionBarPrimitive.FeedbackNegative>
          </Tooltip>
          <Tooltip label={t("exportMarkdown")}>
            <ActionBarPrimitive.ExportMarkdown asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("exportMarkdown")}>
                <IconFileExport size={14} />
              </ActionIcon>
            </ActionBarPrimitive.ExportMarkdown>
          </Tooltip>
          <Tooltip label={t("regenerate")}>
            <ActionBarPrimitive.Reload asChild>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("regenerate")}>
                <IconRefresh size={14} />
              </ActionIcon>
            </ActionBarPrimitive.Reload>
          </Tooltip>
        </Group>
      </ActionBarPrimitive.Root>
    </Group>
  );
};

const UserMessageActions = () => {
  const t = useScopedI18n("common.assistant");
  return (
    <ActionBarPrimitive.Root hideWhenRunning className={classes.userActions}>
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
  const t = useScopedI18n("common.assistant");
  return (
    <ComposerPrimitive.Root className={classes.editComposer}>
      <ComposerPrimitive.Input className={classes.editComposerInput} rows={2} />
      <Group gap="xs" justify="flex-end">
        <ComposerPrimitive.Cancel asChild>
          <Button size="compact-sm" variant="default">
            {t("cancelEdit")}
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
    <MessagePrimitive.Root className={`${classes.message} ${classes.userMessageWrap}`}>
      <Box className={classes.userMessage}>
        <MessagePrimitive.Quote>
          {(quote) => (
            <Text component="blockquote" className={classes.messageQuote} size="sm">
              {quote.text}
            </Text>
          )}
        </MessagePrimitive.Quote>
        <MessagePrimitive.Attachments components={{ Attachment: SentAttachment }} />
        <MessagePrimitive.Parts components={{ Text: TextPart, File: FilePart, Image: ImagePart }} />
      </Box>
      <Group justify="flex-end" gap="xs">
        <BranchPicker />
        <UserMessageActions />
      </Group>
    </MessagePrimitive.Root>
  );
};

const formatDuration = (milliseconds: number) =>
  milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(1)} s`;

const formatCost = (cost: number) => {
  if (cost === 0) return "$0";
  if (cost < 0.0001) return `<$0.0001`;
  return `$${cost.toFixed(cost < 0.01 ? 4 : 3)}`;
};

const RequestTelemetry = () => {
  const t = useScopedI18n("common.assistant");
  const metadata = useAuiState((state) => state.message.metadata);
  const telemetry = getAssistantTelemetry(metadata);
  const usage = getAssistantUsage(metadata);
  if (!telemetry) return null;

  return (
    <details className={classes.telemetry}>
      <summary className={classes.telemetrySummary}>
        <Group gap="xs" wrap="wrap">
          <Badge size="xs" variant="light" color="gray">
            {telemetry.modelId}
          </Badge>
          <Badge size="xs" variant="outline" color="gray">
            {telemetry.provider}
          </Badge>
          {telemetry.durationMs !== undefined && (
            <Text size="xs" c="dimmed">
              {formatDuration(telemetry.durationMs)}
            </Text>
          )}
          {telemetry.outputTokensPerSecond !== undefined && (
            <Text size="xs" c="dimmed">
              {telemetry.outputTokensPerSecond.toFixed(1)} tok/s
            </Text>
          )}
          {telemetry.cost !== undefined && (
            <Text size="xs" c="dimmed">
              {formatCost(telemetry.cost)}
            </Text>
          )}
          {usage?.totalTokens !== undefined && (
            <Text size="xs" c="dimmed">
              {usage.totalTokens.toLocaleString()} {t("usage.tokens")}
            </Text>
          )}
          <IconChevronDown size={13} />
        </Group>
      </summary>
      <Stack gap="sm" mt="xs">
        {telemetry.contextLength !== undefined && telemetry.contextUsed !== undefined && (
          <Box>
            <Group justify="space-between" gap="xs">
              <Text size="xs" fw={600}>
                {t("usage.contextWindow")}
              </Text>
              <Text size="xs" c="dimmed">
                {telemetry.contextUsed.toLocaleString()} / {telemetry.contextLength.toLocaleString()}
              </Text>
            </Group>
            <Progress value={(telemetry.contextUtilization ?? 0) * 100} size="sm" mt={5} />
          </Box>
        )}
        <Box className={classes.usageGrid}>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.input")}
            </Text>
            <Text size="sm" fw={600}>
              {usage?.inputTokens?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.output")}
            </Text>
            <Text size="sm" fw={600}>
              {usage?.outputTokens?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.cached")}
            </Text>
            <Text size="sm" fw={600}>
              {usage?.cachedInputTokens?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.reasoning")}
            </Text>
            <Text size="sm" fw={600}>
              {usage?.reasoningTokens?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.cacheWrite")}
            </Text>
            <Text size="sm" fw={600}>
              {usage?.cacheWriteTokens?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </div>
        </Box>
        <Divider />
        <Group gap="lg" align="flex-start">
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.firstOutput")}
            </Text>
            <Text size="sm" fw={600}>
              {telemetry.timeToFirstOutputMs !== undefined
                ? formatDuration(telemetry.timeToFirstOutputMs)
                : t("usage.notReported")}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("usage.cost")}
            </Text>
            <Text size="sm" fw={600}>
              {telemetry.cost !== undefined ? formatCost(telemetry.cost) : t("usage.notReported")}
            </Text>
            {telemetry.costType && (
              <Text size="xs" c="dimmed">
                {t(`usage.${telemetry.costType}`)}
              </Text>
            )}
          </div>
          {telemetry.upstreamCost !== undefined && (
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.upstreamCost")}
              </Text>
              <Text size="sm" fw={600}>
                {formatCost(telemetry.upstreamCost)}
              </Text>
            </div>
          )}
          {telemetry.finishReason && (
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.finishReason")}
              </Text>
              <Text size="sm" fw={600}>
                {telemetry.finishReason}
              </Text>
            </div>
          )}
        </Group>
        {telemetry.steps.length > 0 && (
          <Stack gap={4}>
            <Text size="xs" fw={600}>
              {t("usage.agentSteps")}
            </Text>
            {telemetry.steps.map((step) => (
              <Box key={step.index} className={classes.stepRow}>
                <Group justify="space-between" gap="xs">
                  <Text size="xs">
                    {t("usage.step", { number: step.index })}
                    {step.routedProvider ? ` · ${step.routedProvider}` : ""}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDuration(step.durationMs)}
                    {step.outputTokensPerSecond !== undefined
                      ? ` · ${step.outputTokensPerSecond.toFixed(1)} tok/s`
                      : ""}
                    {step.cost !== undefined ? ` · ${formatCost(step.cost)}` : ""}
                  </Text>
                </Group>
                {step.generationId && (
                  <Text size="xs" c="dimmed" className={classes.generationId} title={step.generationId}>
                    {t("usage.generation")}: {step.generationId}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </details>
  );
};

const RuntimeError = () => {
  const t = useScopedI18n("common.assistant");
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
                {t("responseError.retry")}
              </Button>
            </ActionBarPrimitive.Reload>
          </Stack>
        </Group>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage = () => (
  <MessagePrimitive.Root className={`${classes.message} ${classes.assistantMessage}`}>
    <MessagePrimitive.Parts
      components={{
        Text: TextPart,
        Reasoning: ReasoningPart,
        Source: SourcePart,
        File: FilePart,
        Image: ImagePart,
        tools: { Fallback: ToolPart },
      }}
    />
    <RuntimeError />
    <RequestTelemetry />
    <AssistantMessageActions />
  </MessagePrimitive.Root>
);

const HistorySelectContext = createContext<() => void>(() => undefined);

const ThreadListItem = () => {
  const t = useScopedI18n("common.assistant");
  const onSelect = useContext(HistorySelectContext);
  return (
    <ThreadListItemPrimitive.Root className={classes.historyItem}>
      <Group gap={4} wrap="nowrap">
        <ThreadListItemPrimitive.Trigger asChild>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            justify="flex-start"
            flex={1}
            style={{ minWidth: 0 }}
            onClick={onSelect}
          >
            <ThreadListItemPrimitive.Title fallback={t("newConversation")} />
          </Button>
        </ThreadListItemPrimitive.Trigger>
        <ThreadListItemPrimitive.Delete asChild>
          <ActionIcon variant="subtle" color="red" size="sm" aria-label={t("delete")}>
            <IconTrash size={14} />
          </ActionIcon>
        </ThreadListItemPrimitive.Delete>
      </Group>
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadHistory = ({ onSelect }: { onSelect: () => void }) => {
  const t = useScopedI18n("common.assistant");
  return (
    <HistorySelectContext.Provider value={onSelect}>
      <Stack className={classes.historyMenu} gap="xs" p="xs">
        <Group gap="xs" wrap="nowrap" px={4} pt={4}>
          <ThreadListPrimitive.New asChild>
            <Button variant="light" leftSection={<IconPlus size={16} />} fullWidth onClick={onSelect}>
              {t("newConversation")}
            </Button>
          </ThreadListPrimitive.New>
        </Group>
        <Group gap="xs" px="xs" mt="xs">
          <IconHistory size={14} />
          <Text size="sm" fw={600} c="dimmed">
            {t("conversations")}
          </Text>
        </Group>
        <ScrollArea h="min(24rem, 55dvh)" type="auto" offsetScrollbars>
          <Stack gap={3}>
            <ThreadListPrimitive.Items components={{ ThreadListItem }} />
          </Stack>
        </ScrollArea>
      </Stack>
    </HistorySelectContext.Provider>
  );
};

const ConversationHistory = () => {
  const t = useScopedI18n("common.assistant");
  const [opened, setOpened] = useState(false);
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width="min(22rem, calc(100vw - 1rem))"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <Button
          className={classes.historyButton}
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconHistory size={16} />}
          classNames={{ section: classes.historyButtonSection, label: classes.historyButtonLabel }}
          onClick={() => setOpened((current) => !current)}
          aria-label={opened ? t("closeHistory") : t("openHistory")}
        >
          {t("conversations")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <ThreadHistory onSelect={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
};

const EmptyThread = () => {
  const t = useScopedI18n("common.assistant");
  return (
    <ThreadPrimitive.Empty>
      <Box className={classes.empty}>
        <Stack align="center" gap="lg" maw={560} w="100%">
          <Stack align="center" gap="xs" maw={430}>
            <ThemeIcon size={52} radius="xl" variant="light" color="red">
              <IconRobot size={27} />
            </ThemeIcon>
            <Text size="xl" fw={700}>
              {t("emptyTitle")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("emptyDescription")}
            </Text>
          </Stack>
          <Box className={classes.suggestions}>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.health.prompt")} send asChild>
              <Button
                variant="default"
                className={classes.suggestion}
                leftSection={<IconActivityHeartbeat size={18} />}
              >
                {t("suggestions.health.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.explore.prompt")} send asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconApps size={18} />}>
                {t("suggestions.explore.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.media.prompt")} send asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconSearch size={18} />}>
                {t("suggestions.media.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.command.prompt")} send asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconCommand size={18} />}>
                {t("suggestions.command.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
          </Box>
        </Stack>
      </Box>
    </ThreadPrimitive.Empty>
  );
};

const contextIcons = {
  app: IconApps,
  integration: IconLink,
  board: IconMessage,
  widget: IconTool,
  tools: IconTool,
};

const TriggerItem = ({ item, index }: { item: Unstable_TriggerItem; index: number }) => {
  const Icon =
    typeof item.metadata?.icon === "string" && item.metadata.icon in contextIcons
      ? contextIcons[item.metadata.icon as keyof typeof contextIcons]
      : IconAt;
  return (
    <ComposerPrimitive.Unstable_TriggerPopoverItem className={classes.triggerItem} item={item} index={index}>
      <ThemeIcon size="sm" variant="light" color="gray">
        <Icon size={13} />
      </ThemeIcon>
      <div className={classes.triggerItemText}>
        <Text size="sm" fw={600} lineClamp={1}>
          {item.label}
        </Text>
        {item.description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.description}
          </Text>
        )}
      </div>
    </ComposerPrimitive.Unstable_TriggerPopoverItem>
  );
};

const ComposerTriggers = () => {
  const t = useScopedI18n("common.assistant");
  const aui = useAui();
  const { data: entities = [], isLoading } = clientApi.assistant.getContextEntities.useQuery(undefined, {
    staleTime: 60_000,
  });
  const categories = useMemo(
    () =>
      (["app", "integration", "board", "widget"] as const).map((type) => ({
        id: type,
        label: t(`mentions.${type}`),
        items: entities
          .filter((entity) => entity.type === type)
          .map((entity) => ({
            id: entity.id,
            type: entity.type,
            label: entity.label,
            description: entity.description,
            icon: entity.type,
          })),
      })),
    [entities, t],
  );
  const mention = unstable_useMentionAdapter({
    categories,
    includeModelContextTools: {
      category: { id: "tools", label: t("mentions.tools") },
      formatLabel: (name) => name.replaceAll("_", " "),
      icon: "tools",
    },
    iconMap: contextIcons,
    fallbackIcon: IconAt,
  });
  const slash = unstable_useSlashCommandAdapter({
    removeOnExecute: true,
    commands: [
      {
        id: "health",
        label: "/health",
        description: t("commands.health"),
        execute: () => aui.composer().setText(t("suggestions.health.prompt")),
      },
      {
        id: "explore",
        label: "/explore",
        description: t("commands.explore"),
        execute: () => aui.composer().setText(t("suggestions.explore.prompt")),
      },
      {
        id: "media",
        label: "/media",
        description: t("commands.media"),
        execute: () => aui.composer().setText(t("suggestions.media.prompt")),
      },
    ],
  });

  return (
    <>
      <ComposerPrimitive.Unstable_TriggerPopover
        className={classes.triggerPopover}
        char="@"
        adapter={mention.adapter}
        isLoading={isLoading}
        aria-label={t("mentions.menu")}
      >
        <ComposerPrimitive.Unstable_TriggerPopover.Directive {...mention.directive} />
        <ComposerPrimitive.Unstable_TriggerPopoverCategories className={classes.triggerList}>
          {(items) =>
            items.map((category) => {
              const Icon = contextIcons[category.id as keyof typeof contextIcons] ?? IconAt;
              return (
                <ComposerPrimitive.Unstable_TriggerPopoverCategoryItem
                  key={category.id}
                  categoryId={category.id}
                  className={classes.triggerItem}
                >
                  <ThemeIcon size="sm" variant="light" color="gray">
                    <Icon size={13} />
                  </ThemeIcon>
                  <Text size="sm" fw={600} flex={1}>
                    {category.label}
                  </Text>
                  <IconChevronRight size={14} />
                </ComposerPrimitive.Unstable_TriggerPopoverCategoryItem>
              );
            })
          }
        </ComposerPrimitive.Unstable_TriggerPopoverCategories>
        <ComposerPrimitive.Unstable_TriggerPopoverItems className={classes.triggerList}>
          {(items) =>
            items.map((item, index) => <TriggerItem key={`${item.type}:${item.id}`} item={item} index={index} />)
          }
        </ComposerPrimitive.Unstable_TriggerPopoverItems>
      </ComposerPrimitive.Unstable_TriggerPopover>
      <ComposerPrimitive.Unstable_TriggerPopover
        className={classes.triggerPopover}
        char="/"
        adapter={slash.adapter}
        aria-label={t("commands.menu")}
      >
        <ComposerPrimitive.Unstable_TriggerPopover.Action {...slash.action} />
        <ComposerPrimitive.Unstable_TriggerPopoverItems className={classes.triggerList}>
          {(items) => items.map((item, index) => <TriggerItem key={item.id} item={item} index={index} />)}
        </ComposerPrimitive.Unstable_TriggerPopoverItems>
      </ComposerPrimitive.Unstable_TriggerPopover>
    </>
  );
};

const Composer = () => {
  const t = useScopedI18n("common.assistant");
  const running = useAuiState((state) => state.thread.isRunning);
  return (
    <Box className={classes.composerWrap}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.AttachmentDropzone className={classes.composerDropzone}>
          <ComposerPrimitive.Root className={classes.composer}>
            <ComposerTriggers />
            <ComposerPrimitive.Quote className={classes.composerQuote}>
              <IconQuote size={15} />
              <ComposerPrimitive.QuoteText className={classes.composerQuoteText} />
              <ComposerPrimitive.QuoteDismiss asChild>
                <ActionIcon variant="subtle" color="gray" size="xs" aria-label={t("dismissQuote")}>
                  <IconX size={12} />
                </ActionIcon>
              </ComposerPrimitive.QuoteDismiss>
            </ComposerPrimitive.Quote>
            <ComposerPrimitive.Attachments>{() => <Attachment removable />}</ComposerPrimitive.Attachments>
            <Group className={classes.composerRow} gap="xs" wrap="nowrap" align="flex-end">
              <Group gap={2} wrap="nowrap">
                <Tooltip label={t("attachments.add")}>
                  <ComposerPrimitive.AddAttachment asChild>
                    <ActionIcon variant="subtle" color="gray" size="lg" aria-label={t("attachments.add")}>
                      <IconPaperclip size={17} />
                    </ActionIcon>
                  </ComposerPrimitive.AddAttachment>
                </Tooltip>
                <Tooltip label={t("dictate")}>
                  <ComposerPrimitive.Dictate asChild>
                    <ActionIcon variant="subtle" color="gray" size="lg" aria-label={t("dictate")}>
                      <IconMicrophone size={17} />
                    </ActionIcon>
                  </ComposerPrimitive.Dictate>
                </Tooltip>
                <ComposerPrimitive.StopDictation asChild>
                  <ActionIcon variant="light" color="red" size="lg" aria-label={t("stopDictation")}>
                    <IconPlayerStop size={17} />
                  </ActionIcon>
                </ComposerPrimitive.StopDictation>
              </Group>
              <ComposerPrimitive.Input
                className={classes.composerInput}
                placeholder={t("composerPlaceholder")}
                rows={1}
                data-autofocus
              />
              {running ? (
                <ComposerPrimitive.Cancel asChild>
                  <ActionIcon color="red" variant="light" size="lg" aria-label={t("stop")}>
                    <IconPlayerStop size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Cancel>
              ) : (
                <ComposerPrimitive.Send asChild>
                  <ActionIcon color="red" variant="filled" size="lg" aria-label={t("send")}>
                    <IconArrowUp size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Send>
              )}
            </Group>
            <Group className={classes.composerHints} gap="xs">
              <Text size="xs" c="dimmed">
                {t("mentions.hint")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("commands.hint")}
              </Text>
            </Group>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </Box>
  );
};

const AssistantActivityBar = ({
  isRunning,
  unreadCount,
  latestAssistantText,
  latestUserText,
  latestStatus,
  onOpen,
  onMarkRead,
}: Omit<AssistantPanelProps, "opened" | "onClose">) => {
  const t = useScopedI18n("common.assistant");
  const needsApproval = latestStatus?.type === "requires-action";
  const failed = latestStatus?.type === "incomplete" && latestStatus.reason !== "cancelled";
  const visible = isRunning || unreadCount > 0 || needsApproval;

  if (!visible) return null;

  const title = isRunning
    ? t("activity.thinking")
    : needsApproval
      ? t("activity.approval")
      : failed
        ? t("activity.failed")
        : t("activity.ready");
  const detail = isRunning
    ? latestUserText || t("activity.working")
    : latestAssistantText || (failed ? t("responseError.description") : t("activity.completed"));

  return (
    <Box component="output" className={classes.activityBar} aria-live="polite">
      <UnstyledButton className={classes.activityTrigger} onClick={onOpen} aria-label={t("activity.expand")}>
        <Group gap="sm" wrap="nowrap">
          {isRunning ? (
            <ThemeIcon variant="light" color="red" radius="xl">
              <Loader type="bars" size="sm" color="red" />
            </ThemeIcon>
          ) : (
            <ThemeIcon variant="light" color={failed ? "red" : needsApproval ? "yellow" : "green"} radius="xl">
              {failed ? (
                <IconAlertTriangle size={17} />
              ) : needsApproval ? (
                <IconRobot size={17} />
              ) : (
                <IconCheck size={17} />
              )}
            </ThemeIcon>
          )}
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
          <IconChevronUp size={17} className={classes.activityExpandIcon} />
        </Group>
      </UnstyledButton>
      {!isRunning && !needsApproval && (
        <ActionIcon
          className={classes.activityDismiss}
          variant="subtle"
          color="gray"
          onClick={onMarkRead}
          aria-label={t("activity.dismiss")}
        >
          <IconX size={15} />
        </ActionIcon>
      )}
    </Box>
  );
};

export const AssistantPanel = ({
  opened,
  onOpen,
  onClose,
  onMarkRead,
  isRunning,
  unreadCount,
  latestAssistantText,
  latestUserText,
  latestStatus,
}: AssistantPanelProps) => {
  const t = useScopedI18n("common.assistant");
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useWindowEvent("keydown", (event) => {
    if (opened && event.key === "Escape") onClose();
  });
  useEffect(() => {
    if (!opened) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [opened]);

  return (
    <>
      {!opened && (
        <AssistantActivityBar
          onOpen={onOpen}
          onMarkRead={onMarkRead}
          isRunning={isRunning}
          unreadCount={unreadCount}
          latestAssistantText={latestAssistantText}
          latestUserText={latestUserText}
          latestStatus={latestStatus}
        />
      )}
      {opened && (
        <FocusTrap active>
          <dialog className={classes.floatingPanel} aria-label={t("title")} open>
            <Group className={classes.panelHeader} justify="space-between" wrap="nowrap" gap="xs">
              <Group className={classes.panelIdentity} gap="xs" wrap="nowrap">
                <ThemeIcon variant="light" color="red" radius="xl">
                  <IconRobot size={18} />
                </ThemeIcon>
                <div className={classes.panelIdentityText}>
                  <Text fw={700} lh={1.1} lineClamp={1}>
                    {t("title")}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {isRunning ? t("activity.thinking") : t("subtitle")}
                  </Text>
                </div>
              </Group>
              <Group className={classes.panelActions} gap={2} wrap="nowrap">
                <ConversationHistory />
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
                <ActionIcon
                  className={classes.panelAction}
                  variant="subtle"
                  color="gray"
                  onClick={onClose}
                  aria-label={t("close")}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>
            <ThreadPrimitive.Root className={classes.thread}>
              <ThreadPrimitive.Viewport className={classes.viewport}>
                <Box className={classes.messages}>
                  <EmptyThread />
                  <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                </Box>
                <SelectionToolbarPrimitive.Root className={classes.selectionToolbar}>
                  <SelectionToolbarPrimitive.Quote asChild>
                    <Button variant="filled" color="dark" size="compact-sm" leftSection={<IconQuote size={14} />}>
                      {t("quoteSelection")}
                    </Button>
                  </SelectionToolbarPrimitive.Quote>
                </SelectionToolbarPrimitive.Root>
                <ThreadPrimitive.ScrollToBottom asChild>
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
              <Composer />
            </ThreadPrimitive.Root>
          </dialog>
        </FocusTrap>
      )}
    </>
  );
};
