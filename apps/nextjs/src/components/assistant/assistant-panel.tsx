"use client";

import type { ComponentPropsWithoutRef, RefObject } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  unstable_useTriggerPopoverScopeContext,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Combobox,
  Divider,
  FocusTrap,
  Group,
  Loader,
  Menu,
  Popover,
  RingProgress,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconApps,
  IconArrowUp,
  IconArrowsMaximize,
  IconAt,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconDownload,
  IconFile,
  IconFileExport,
  IconLink,
  IconMessage,
  IconMinus,
  IconPaperclip,
  IconPalette,
  IconPencil,
  IconHistory,
  IconPlayerStop,
  IconPlus,
  IconQuote,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconThumbDown,
  IconThumbUp,
  IconTool,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { clientApi } from "@homarr/api/client";
import { assistantReasoningModes } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { useAssistantAutoApproval, useAssistantAutomaticAction } from "./assistant-auto-approval";
import { normalizeAssistantMarkdown } from "./assistant-markdown";
import { getAssistantTelemetry, getAssistantUsage } from "./assistant-message-metadata";
import type { AssistantPendingAction } from "./assistant-pending-action";
import { AssistantQuestionPortalProvider } from "./assistant-question-portal";
import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";
import { getNearestTriggerScrollTop } from "./assistant-trigger-scroll";
import { getToolResultPresentation } from "./assistant-tool-result";

export interface AssistantConversationControls {
  modelId: string | null;
  models: AssistantRuntimeModelOption[];
  modelOptionsLoading: boolean;
  reasoning: AssistantReasoningMode;
  onModelChange: (modelId: string) => void;
  onReasoningChange: (reasoning: AssistantReasoningMode) => void;
}

interface AssistantPanelProps extends AssistantConversationControls {
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDismissActivity: () => void;
  activityDismissed: boolean;
  isRunning: boolean;
  unreadCount: number;
  latestAssistantText: string;
  latestUserText: string;
  latestStatus: MessageStatus | undefined;
  pendingAction: AssistantPendingAction | undefined;
}

const markdownRemarkPlugins = [remarkGfm, remarkBreaks];

const MarkdownLink = ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
  const external = href !== undefined && /^https?:\/\//iu.test(href);
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} {...props}>
      {children}
    </a>
  );
};

const MarkdownTable = ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
  <div className={classes.markdownTableWrap}>
    <table {...props}>{children}</table>
  </div>
);

const AssistantTextPart = () => (
  <MarkdownTextPrimitive
    className={classes.messageMarkdown}
    preprocess={normalizeAssistantMarkdown}
    remarkPlugins={markdownRemarkPlugins}
    components={{ a: MarkdownLink, table: MarkdownTable }}
    defer
  />
);

const UserTextPart = () => <MessagePartPrimitive.Text className={classes.messageText} />;

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

const formatToolResultValue = (value: string | number | boolean) =>
  typeof value === "number" ? value.toLocaleString() : String(value);

const ToolResultPreview = ({ result }: { result: unknown }) => {
  const presentation = getToolResultPresentation(result);
  if (!presentation) return null;

  if (presentation.type === "text") {
    return (
      <Text size="sm" className={classes.toolResultText}>
        {presentation.text}
      </Text>
    );
  }

  if (presentation.type === "properties") {
    return (
      <Box className={classes.toolResultProperties}>
        {presentation.fields.map((field) => (
          <Box key={field.label} className={classes.toolResultProperty}>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {field.label}
            </Text>
            <Text size="sm" fw={600} lineClamp={2}>
              {formatToolResultValue(field.value)}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  const hiddenCount = Math.max(0, presentation.totalCount - presentation.items.length);
  return (
    <Box className={classes.toolResultCollection}>
      {presentation.items.map((item, index) => (
        <Box key={`${item.title}-${index}`} className={classes.toolResultItem}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Box className={classes.toolResultIdentity}>
              <Text size="sm" fw={650} lineClamp={1}>
                {item.title}
              </Text>
              {item.description && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.description}
                </Text>
              )}
            </Box>
            {item.badges.length > 0 && (
              <Group gap={4} wrap="nowrap">
                {item.badges.map((badge) => (
                  <Badge key={badge} size="xs" variant="light" color="gray">
                    {badge}
                  </Badge>
                ))}
              </Group>
            )}
          </Group>
          {item.fields.length > 0 && (
            <Group gap="xs" mt={6} wrap="wrap">
              {item.fields.map((field) => (
                <Text key={field.label} size="xs" c="dimmed">
                  {field.label}:{" "}
                  <Text component="span" inherit c="var(--mantine-color-text)" fw={600}>
                    {formatToolResultValue(field.value)}
                  </Text>
                </Text>
              ))}
            </Group>
          )}
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Badge className={classes.toolResultMore} size="sm" variant="outline" color="gray">
          +{hiddenCount}
        </Badge>
      )}
    </Box>
  );
};

const ToolPart = ({
  toolCallId,
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
  const [approvalResponse, setApprovalResponse] = useState<"approve" | "deny" | null>(null);
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
  const autoApprovalInProgress = useAssistantAutomaticAction({
    toolCallId,
    ready: awaitingApproval,
    completed: !awaitingApproval,
    confirm: () => {
      respondToApproval({ approved: true, reason: "Approved automatically by the user." });
      setApprovalResponse("approve");
    },
  });

  return (
    <Box className={classes.tool}>
      <UnstyledButton
        className={classes.toolHeader}
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
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
        <Box className={classes.approvalPanel}>
          <Text size="sm" fw={600}>
            {t("approvalDescription")}
          </Text>
          <ToolResultPreview result={args} />
          {autoApprovalInProgress ? (
            <Group className={classes.autoApprovalProgress} gap="sm" wrap="nowrap">
              <Loader type="bars" size="sm" color="green" />
              <Text size="sm" fw={600}>
                {t("autoApproval.approving")}
              </Text>
            </Group>
          ) : (
            <Group className={classes.approvalActions} gap="sm" grow wrap="nowrap">
              <Button
                size="md"
                fullWidth
                leftSection={<IconCheck size={18} />}
                loading={approvalResponse === "approve"}
                disabled={approvalResponse !== null}
                onClick={() => {
                  setApprovalResponse("approve");
                  respondToApproval({ approved: true });
                }}
              >
                {t("approveAndRun")}
              </Button>
              <Button
                size="md"
                fullWidth
                variant="default"
                leftSection={<IconX size={18} />}
                loading={approvalResponse === "deny"}
                disabled={approvalResponse !== null}
                onClick={() => {
                  setApprovalResponse("deny");
                  respondToApproval({ approved: false });
                }}
              >
                {t("deny")}
              </Button>
            </Group>
          )}
        </Box>
      )}
      {successful && result !== undefined && <ToolResultPreview result={result} />}
      <Collapse expanded={opened}>
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
        <MessagePrimitive.Parts components={{ Text: UserTextPart, File: FilePart, Image: ImagePart }} />
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
  if (cost < 0.00001) return `<$0.00001`;
  return `$${cost.toFixed(cost < 0.001 ? 5 : cost < 0.01 ? 4 : 3)}`;
};

const getContextColor = (percentage: number) => {
  if (percentage >= 90) return "red";
  if (percentage >= 75) return "orange";
  return "blue";
};

const RequestTelemetry = () => {
  const t = useScopedI18n("common.assistant");
  const [opened, setOpened] = useState(false);
  const metadata = useAuiState((state) => state.message.metadata);
  const messageId = useAuiState((state) => state.message.id);
  const threadId = useAuiState((state) => state.threadListItem.remoteId);
  const persistedTelemetry = getAssistantTelemetry(metadata);
  const persistedUsage = getAssistantUsage(metadata);
  const generationQuery = clientApi.assistant.getGenerationTelemetry.useQuery(
    { threadId: threadId ?? "", messageId },
    {
      enabled: opened && persistedTelemetry?.provider === "openrouter" && Boolean(threadId),
      refetchInterval: (query) =>
        query.state.data?.complete === false && query.state.dataUpdateCount < 6 ? 1500 : false,
      retry: 2,
      staleTime: (query) => (query.state.data?.complete ? 5 * 60_000 : 0),
    },
  );
  if (!persistedTelemetry) return null;

  const generationById = new Map(
    generationQuery.data?.generations.flatMap((generation) =>
      generation.generationId ? [[generation.generationId, generation] as const] : [],
    ) ?? [],
  );
  const steps = persistedTelemetry.steps.map((step) => ({
    ...step,
    ...(step.generationId ? generationById.get(step.generationId) : undefined),
  }));
  const sumCompleteMetric = (getValue: (step: (typeof steps)[number]) => number | undefined) => {
    if (steps.length === 0) return undefined;
    const values = steps.map(getValue);
    return values.some((value) => value === undefined)
      ? undefined
      : (values as number[]).reduce((sum, value) => sum + value, 0);
  };
  const providerInputTokens = sumCompleteMetric((step) => step.inputTokens);
  const providerOutputTokens = sumCompleteMetric((step) => step.outputTokens);
  const providerGenerationTimeMs = sumCompleteMetric((step) => step.generationTimeMs);
  const providerOutputTokensPerSecond =
    providerOutputTokens !== undefined && providerGenerationTimeMs !== undefined && providerGenerationTimeMs > 0
      ? providerOutputTokens / (providerGenerationTimeMs / 1000)
      : undefined;
  const latestStep = steps.at(-1);
  const providerContextUsed =
    latestStep?.inputTokens !== undefined && latestStep.outputTokens !== undefined
      ? latestStep.inputTokens + latestStep.outputTokens
      : undefined;
  const usage = {
    ...persistedUsage,
    ...(generationQuery.data?.complete && providerInputTokens !== undefined
      ? { inputTokens: providerInputTokens }
      : {}),
    ...(generationQuery.data?.complete && providerOutputTokens !== undefined
      ? { outputTokens: providerOutputTokens }
      : {}),
    ...(generationQuery.data?.complete && providerInputTokens !== undefined && providerOutputTokens !== undefined
      ? { totalTokens: providerInputTokens + providerOutputTokens }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cachedInputTokens) !== undefined
      ? { cachedInputTokens: sumCompleteMetric((step) => step.cachedInputTokens) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.reasoningTokens) !== undefined
      ? { reasoningTokens: sumCompleteMetric((step) => step.reasoningTokens) }
      : {}),
  };
  const telemetry = {
    ...persistedTelemetry,
    steps,
    ...(generationQuery.data?.complete && providerGenerationTimeMs !== undefined
      ? { generationTimeMs: providerGenerationTimeMs }
      : {}),
    ...(generationQuery.data?.complete && providerOutputTokensPerSecond !== undefined
      ? { providerOutputTokensPerSecond }
      : {}),
    ...(generationQuery.data?.complete && providerContextUsed !== undefined
      ? {
          contextUsed: providerContextUsed,
          ...(persistedTelemetry.contextLength
            ? { contextUtilization: Math.min(providerContextUsed / persistedTelemetry.contextLength, 1) }
            : {}),
        }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cost) !== undefined
      ? { cost: sumCompleteMetric((step) => step.cost), costType: "reported" as const }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.upstreamCost) !== undefined
      ? { upstreamCost: sumCompleteMetric((step) => step.upstreamCost) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.cacheDiscount) !== undefined
      ? { cacheDiscount: sumCompleteMetric((step) => step.cacheDiscount) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.fallbackCount) !== undefined
      ? { fallbackCount: sumCompleteMetric((step) => step.fallbackCount) }
      : {}),
    ...(generationQuery.data?.complete && sumCompleteMetric((step) => step.fallbackLatencyMs) !== undefined
      ? { fallbackLatencyMs: sumCompleteMetric((step) => step.fallbackLatencyMs) }
      : {}),
  };

  const contextLength = telemetry.contextLength ?? 0;
  const contextUsed = telemetry.contextUsed ?? 0;
  const hasContextWindow = telemetry.contextLength !== undefined && telemetry.contextUsed !== undefined;
  const contextPercentage = hasContextWindow
    ? Math.min(
        100,
        Math.max(0, Math.round((telemetry.contextUtilization ?? contextUsed / Math.max(contextLength, 1)) * 100)),
      )
    : 0;
  const contextRemaining = hasContextWindow ? Math.max(contextLength - contextUsed, 0) : undefined;
  const contextLabel = hasContextWindow
    ? `${t("usage.contextWindow")}: ${contextUsed.toLocaleString()} / ${contextLength.toLocaleString()} (${contextPercentage}%)`
    : `${t("usage.contextWindow")}: ${t("usage.notReported")}`;
  const displayedThroughput = telemetry.providerOutputTokensPerSecond ?? telemetry.outputTokensPerSecond;
  const hasProviderMetrics =
    telemetry.provider === "openrouter" ||
    generationQuery.isFetching ||
    telemetry.providerOutputTokensPerSecond !== undefined ||
    telemetry.generationTimeMs !== undefined ||
    telemetry.cacheDiscount !== undefined ||
    telemetry.fallbackCount !== undefined ||
    telemetry.fallbackLatencyMs !== undefined ||
    telemetry.steps.some(
      (step) =>
        step.providerLatencyMs !== undefined ||
        step.moderationLatencyMs !== undefined ||
        step.serviceTier !== undefined ||
        step.dataRegion !== undefined,
    );

  return (
    <Box className={classes.telemetry}>
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Group className={classes.telemetryFacts} gap="xs" wrap="wrap">
          <Badge className={classes.modelBadge} size="xs" variant="light" color="gray">
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
          {displayedThroughput !== undefined && (
            <Text size="xs" c="dimmed">
              {displayedThroughput.toFixed(1)} tok/s
            </Text>
          )}
          {telemetry.cost !== undefined && (
            <Text size="xs" c="dimmed">
              {formatCost(telemetry.cost)}
            </Text>
          )}
        </Group>

        <Popover
          opened={opened}
          onChange={setOpened}
          width="min(23rem, calc(100vw - 1.5rem))"
          position="bottom-end"
          shadow="md"
          withArrow
          trapFocus
          returnFocus
        >
          <Popover.Target>
            <UnstyledButton
              className={classes.contextMeter}
              aria-label={contextLabel}
              aria-expanded={opened}
              aria-haspopup="dialog"
              title={contextLabel}
              onClick={() => setOpened((value) => !value)}
            >
              <RingProgress
                size={40}
                thickness={4}
                roundCaps
                sections={
                  hasContextWindow ? [{ value: contextPercentage, color: getContextColor(contextPercentage) }] : []
                }
                label={
                  <Text className={classes.contextMeterLabel} ta="center" fw={700}>
                    {hasContextWindow ? `${contextPercentage}%` : "–"}
                  </Text>
                }
              />
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown className={classes.telemetryPopover}>
            <Stack gap="sm">
              <Group justify="space-between" gap="xs">
                <div>
                  <Text size="sm" fw={700}>
                    {t("usage.contextWindow")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("usage.requestDetails")}
                  </Text>
                </div>
                <Badge size="sm" variant="light" color={getContextColor(contextPercentage)}>
                  {hasContextWindow ? `${contextPercentage}%` : t("usage.notReported")}
                </Badge>
              </Group>

              <Box className={classes.contextStats}>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("usage.used")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {telemetry.contextUsed?.toLocaleString() ?? t("usage.notReported")}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("usage.remaining")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {contextRemaining?.toLocaleString() ?? t("usage.notReported")}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("usage.capacity")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {telemetry.contextLength?.toLocaleString() ?? t("usage.notReported")}
                  </Text>
                </div>
              </Box>

              <Divider />
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
                <div>
                  <Text size="xs" c="dimmed">
                    {t("usage.tokens")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {usage?.totalTokens?.toLocaleString() ?? t("usage.notReported")}
                  </Text>
                </div>
              </Box>

              <Divider />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                {t("usage.homarrTiming")}
              </Text>
              <Box className={classes.usageGrid}>
                <div>
                  <Text size="xs" c="dimmed">
                    {t("usage.endToEnd")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : t("usage.notReported")}
                  </Text>
                </div>
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
                    {t("usage.observedThroughput")}
                  </Text>
                  <Text size="sm" fw={600}>
                    {telemetry.outputTokensPerSecond !== undefined
                      ? `${telemetry.outputTokensPerSecond.toFixed(1)} tok/s`
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
              </Box>

              {hasProviderMetrics && (
                <>
                  <Divider />
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    {t("usage.providerTiming")}
                  </Text>
                  {generationQuery.isFetching && generationQuery.data?.complete !== true && (
                    <Group gap="xs">
                      <Loader size="xs" type="bars" />
                      <Text size="xs" c="dimmed">
                        {t("usage.loadingProviderDetails")}
                      </Text>
                    </Group>
                  )}
                  {!generationQuery.isFetching && generationQuery.data?.complete === false && (
                    <Text size="xs" c="dimmed">
                      {t("usage.providerDetailsPending")}
                    </Text>
                  )}
                  <Box className={classes.usageGrid}>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("usage.generationTime")}
                      </Text>
                      <Text size="sm" fw={600}>
                        {telemetry.generationTimeMs !== undefined
                          ? formatDuration(telemetry.generationTimeMs)
                          : t("usage.notReported")}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("usage.providerThroughput")}
                      </Text>
                      <Text size="sm" fw={600}>
                        {telemetry.providerOutputTokensPerSecond !== undefined
                          ? `${telemetry.providerOutputTokensPerSecond.toFixed(1)} tok/s`
                          : t("usage.notReported")}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("usage.fallbacks")}
                      </Text>
                      <Text size="sm" fw={600}>
                        {telemetry.fallbackCount?.toLocaleString() ?? t("usage.notReported")}
                      </Text>
                    </div>
                    {telemetry.fallbackLatencyMs !== undefined && (
                      <div>
                        <Text size="xs" c="dimmed">
                          {t("usage.fallbackLatency")}
                        </Text>
                        <Text size="sm" fw={600}>
                          {formatDuration(telemetry.fallbackLatencyMs)}
                        </Text>
                      </div>
                    )}
                    {telemetry.cacheDiscount !== undefined && (
                      <div>
                        <Text size="xs" c="dimmed">
                          {t("usage.cacheDiscount")}
                        </Text>
                        <Text size="sm" fw={600}>
                          {formatCost(telemetry.cacheDiscount)}
                        </Text>
                      </div>
                    )}
                  </Box>
                </>
              )}

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
                          {step.providerOutputTokensPerSecond !== undefined
                            ? ` · ${step.providerOutputTokensPerSecond.toFixed(1)} tok/s`
                            : step.outputTokensPerSecond !== undefined
                              ? ` · ${step.outputTokensPerSecond.toFixed(1)} tok/s`
                              : ""}
                          {step.cost !== undefined ? ` · ${formatCost(step.cost)}` : ""}
                        </Text>
                      </Group>
                      {(step.providerLatencyMs !== undefined ||
                        step.generationTimeMs !== undefined ||
                        step.moderationLatencyMs !== undefined ||
                        step.fallbackCount !== undefined ||
                        step.fallbackLatencyMs !== undefined) && (
                        <Text size="xs" c="dimmed">
                          {[
                            step.providerLatencyMs !== undefined
                              ? `${t("usage.providerLatency")} ${formatDuration(step.providerLatencyMs)}`
                              : undefined,
                            step.generationTimeMs !== undefined
                              ? `${t("usage.generationTime")} ${formatDuration(step.generationTimeMs)}`
                              : undefined,
                            step.moderationLatencyMs !== undefined
                              ? `${t("usage.moderationLatency")} ${formatDuration(step.moderationLatencyMs)}`
                              : undefined,
                            step.fallbackCount !== undefined
                              ? `${t("usage.fallbacks")} ${step.fallbackCount.toLocaleString()}`
                              : undefined,
                            step.fallbackLatencyMs !== undefined
                              ? `${t("usage.fallbackLatency")} ${formatDuration(step.fallbackLatencyMs)}`
                              : undefined,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      )}
                      {(step.inputTokens !== undefined || step.outputTokens !== undefined) && (
                        <Text size="xs" c="dimmed">
                          {[
                            step.inputTokens !== undefined
                              ? `${step.inputTokens.toLocaleString()} ${t("usage.inputShort")}`
                              : undefined,
                            step.outputTokens !== undefined
                              ? `${step.outputTokens.toLocaleString()} ${t("usage.outputShort")}`
                              : undefined,
                            step.cachedInputTokens !== undefined
                              ? `${step.cachedInputTokens.toLocaleString()} ${t("usage.cachedShort")}`
                              : undefined,
                            step.reasoningTokens !== undefined
                              ? `${step.reasoningTokens.toLocaleString()} ${t("usage.reasoningShort")}`
                              : undefined,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      )}
                      {(step.serviceTier ||
                        step.dataRegion ||
                        step.routerStrategy ||
                        step.routerRegion ||
                        step.isByok) && (
                        <Text size="xs" c="dimmed">
                          {[
                            step.routerStrategy,
                            step.routerRegion,
                            step.serviceTier,
                            step.dataRegion,
                            step.isByok ? t("usage.byok") : undefined,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      )}
                      {(step.normalizedInputTokens !== undefined || step.normalizedOutputTokens !== undefined) &&
                        (step.normalizedInputTokens !== step.inputTokens ||
                          step.normalizedOutputTokens !== step.outputTokens) && (
                          <Text size="xs" c="dimmed">
                            {t("usage.normalizedTokens")}: {step.normalizedInputTokens?.toLocaleString() ?? "–"} /{" "}
                            {step.normalizedOutputTokens?.toLocaleString() ?? "–"}
                          </Text>
                        )}
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
          </Popover.Dropdown>
        </Popover>
      </Group>
    </Box>
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
        Text: AssistantTextPart,
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
        <ScrollArea.Autosize mah="min(24rem, 55dvh)" type="auto" offsetScrollbars>
          <Stack gap={3}>
            <ThreadListPrimitive.Items components={{ ThreadListItem }} />
          </Stack>
        </ScrollArea.Autosize>
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
      onDismiss={() => setOpened(false)}
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
          onKeyDown={(event) => {
            if (event.key === "Escape" && opened) {
              event.stopPropagation();
              setOpened(false);
            }
          }}
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

const AutoApprovalControl = () => {
  const t = useScopedI18n("common.assistant.autoApproval");
  const [opened, setOpened] = useState(false);
  const { enabled, setEnabled } = useAssistantAutoApproval();

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      onDismiss={() => setOpened(false)}
      position="bottom-end"
      width="min(19rem, calc(100vw - 1rem))"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <ActionIcon
          className={classes.panelAction}
          variant={enabled ? "light" : "subtle"}
          color={enabled ? "green" : "gray"}
          onClick={() => setOpened((current) => !current)}
          aria-label={t("label")}
          aria-pressed={enabled}
          title={enabled ? t("enabled") : t("label")}
        >
          <IconShieldCheck size={17} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Box>
            <Text size="sm" fw={700}>
              {t("title")}
            </Text>
            <Text size="xs" c="dimmed" mt={3}>
              {t("description")}
            </Text>
          </Box>
          <Button
            fullWidth
            variant={enabled ? "default" : "light"}
            color={enabled ? "gray" : "green"}
            leftSection={<IconShieldCheck size={16} />}
            onClick={() => {
              setEnabled(!enabled);
              setOpened(false);
            }}
          >
            {enabled ? t("disable") : t("enable")}
          </Button>
        </Stack>
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
            <ThreadPrimitive.Suggestion prompt={t("suggestions.style.prompt")} send asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconPalette size={18} />}>
                {t("suggestions.style.label")}
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

const TriggerPopoverAutoScroll = ({ viewportRef }: { viewportRef: RefObject<HTMLDivElement | null> }) => {
  const { activeCategoryId, categories, highlightedIndex, isSearchMode, items, open, query } =
    unstable_useTriggerPopoverScopeContext();

  useLayoutEffect(() => {
    if (!open) return;

    const viewport = viewportRef.current;
    const highlightedItem = viewport?.querySelector<HTMLElement>("[data-highlighted]");
    if (!viewport || !highlightedItem) return;

    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = highlightedItem.getBoundingClientRect();
    const viewportTop = viewportRect.top + viewport.clientTop;
    const viewportBottom = viewportTop + viewport.clientHeight;

    viewport.scrollTop = getNearestTriggerScrollTop({
      scrollTop: viewport.scrollTop,
      viewportTop,
      viewportBottom,
      itemTop: itemRect.top,
      itemBottom: itemRect.bottom,
    });
  }, [activeCategoryId, categories, highlightedIndex, isSearchMode, items, open, query, viewportRef]);

  return null;
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
  const mentionViewportRef = useRef<HTMLDivElement>(null);
  const slashViewportRef = useRef<HTMLDivElement>(null);
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
      {
        id: "style",
        label: "/style",
        description: t("commands.style"),
        execute: () => aui.composer().setText(t("suggestions.style.prompt")),
      },
    ],
  });

  return (
    <>
      <ComposerPrimitive.Unstable_TriggerPopover
        ref={mentionViewportRef}
        className={classes.triggerPopover}
        char="@"
        adapter={mention.adapter}
        isLoading={isLoading}
        aria-label={t("mentions.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={mentionViewportRef} />
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
        ref={slashViewportRef}
        className={classes.triggerPopover}
        char="/"
        adapter={slash.adapter}
        aria-label={t("commands.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={slashViewportRef} />
        <ComposerPrimitive.Unstable_TriggerPopover.Action {...slash.action} />
        <ComposerPrimitive.Unstable_TriggerPopoverItems className={classes.triggerList}>
          {(items) => items.map((item, index) => <TriggerItem key={item.id} item={item} index={index} />)}
        </ComposerPrimitive.Unstable_TriggerPopoverItems>
      </ComposerPrimitive.Unstable_TriggerPopover>
    </>
  );
};

type ComposerProps = AssistantConversationControls & { pendingAction: AssistantPendingAction | undefined };

const RuntimeControls = ({
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  onModelChange,
  onReasoningChange,
}: ComposerProps) => {
  const t = useScopedI18n("common.assistant");
  const [modelSearch, setModelSearch] = useState("");
  const selectedModel = models.find((model) => model.id === modelId);
  const normalizedModelSearch = modelSearch.trim().toLocaleLowerCase();
  const visibleModels =
    normalizedModelSearch.length === 0
      ? models
      : models.filter(
          (model) =>
            model.name.toLocaleLowerCase().includes(normalizedModelSearch) ||
            model.id.toLocaleLowerCase().includes(normalizedModelSearch),
        );
  const modelCombobox = useCombobox({
    onDropdownOpen: () => {
      modelCombobox.selectActiveOption();
      requestAnimationFrame(() => modelCombobox.focusSearchInput());
    },
    onDropdownClose: () => {
      modelCombobox.resetSelectedOption();
      setModelSearch("");
    },
  });

  const selectModel = (value: string) => {
    if (!models.some((model) => model.id === value)) return;
    onModelChange(value);
    modelCombobox.closeDropdown();
  };

  return (
    <Group className={classes.runtimeControls} gap={0} wrap="nowrap">
      <Button.Group
        className={classes.runtimeButtonGroup}
        aria-label={`${t("runtime.model")}, ${t("runtime.thinking")}`}
      >
        <Combobox store={modelCombobox} onOptionSubmit={selectModel} withinPortal position="top-start" width={320}>
          <Combobox.Target>
            <Button
              className={classes.modelButton}
              classNames={{ root: classes.runtimeButton, label: classes.runtimeButtonLabel }}
              variant="default"
              size="compact-sm"
              disabled={modelOptionsLoading || models.length === 0}
              leftSection={modelOptionsLoading ? <Loader size={13} /> : <IconSparkles size={14} />}
              rightSection={<Combobox.Chevron size="xs" />}
              onClick={() => modelCombobox.toggleDropdown()}
              aria-label={`${t("runtime.model")}: ${selectedModel?.name ?? t("runtime.noModels")}`}
              title={selectedModel?.name}
            >
              {selectedModel?.name ?? t("runtime.model")}
            </Button>
          </Combobox.Target>
          <Combobox.Dropdown className={classes.modelDropdown}>
            <Combobox.Search
              value={modelSearch}
              onChange={(event) => {
                setModelSearch(event.currentTarget.value);
                modelCombobox.updateSelectedOptionIndex();
              }}
              placeholder={t("runtime.model")}
              aria-label={t("runtime.model")}
            />
            <Combobox.Options className={classes.modelOptions}>
              {visibleModels.map((model) => (
                <Combobox.Option
                  className={classes.modelOption}
                  key={model.id}
                  value={model.id}
                  active={model.id === modelId}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Stack gap={0} className={classes.modelOptionText}>
                      <Text size="sm" fw={model.id === modelId ? 650 : 500} lineClamp={1}>
                        {model.name}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {model.id}
                      </Text>
                    </Stack>
                    {model.id === modelId && <IconCheck size={15} className={classes.runtimeOptionCheck} />}
                  </Group>
                </Combobox.Option>
              ))}
              {visibleModels.length === 0 && <Combobox.Empty>{t("runtime.noModels")}</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <Menu position="top-end" width={210} withinPortal>
          <Menu.Target>
            <Button
              className={classes.reasoningButton}
              classNames={{ root: classes.runtimeButton, label: classes.runtimeButtonLabel }}
              variant="default"
              size="compact-sm"
              leftSection={<IconBrain size={14} />}
              rightSection={<IconChevronUp size={14} />}
              aria-label={`${t("runtime.thinking")}: ${t(`runtime.reasoning.${reasoning}`)}`}
              title={t(`runtime.reasoning.${reasoning}`)}
            >
              {t(`runtime.reasoning.${reasoning}`)}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t("runtime.thinking")}</Menu.Label>
            {assistantReasoningModes.map((mode) => (
              <Menu.Item
                key={mode}
                className={classes.runtimeMenuItem}
                data-selected={mode === reasoning || undefined}
                rightSection={mode === reasoning ? <IconCheck size={15} /> : null}
                onClick={() => onReasoningChange(mode)}
              >
                {t(`runtime.reasoning.${mode}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Button.Group>
    </Group>
  );
};

const Composer = (props: ComposerProps) => {
  const t = useScopedI18n("common.assistant");
  const running = useAuiState((state) => state.thread.isRunning);
  const hasPendingAction = props.pendingAction !== undefined;
  return (
    <Box className={classes.composerWrap}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.AttachmentDropzone className={classes.composerDropzone}>
          <ComposerPrimitive.Root
            className={classes.composer}
            data-pending-action={hasPendingAction || undefined}
            onSubmit={(event) => {
              if (hasPendingAction) event.preventDefault();
            }}
          >
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
                  <ActionIcon
                    color="red"
                    variant="filled"
                    size="lg"
                    aria-label={hasPendingAction ? t("pendingAction.sendBlocked") : t("send")}
                    disabled={hasPendingAction}
                  >
                    <IconArrowUp size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Send>
              )}
            </Group>
            <Group className={classes.composerFooter} justify="space-between" gap="xs" wrap="nowrap">
              <RuntimeControls {...props} />
              <Group className={classes.composerHints} gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {t("mentions.hint")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("commands.hint")}
                </Text>
              </Group>
            </Group>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </Box>
  );
};

const usePendingActionCopy = (action: AssistantPendingAction | undefined) => {
  const t = useScopedI18n("common.assistant");
  if (!action) return undefined;
  if (action.kind === "question") {
    return { title: t("pendingAction.answerTitle"), detail: action.detail ?? t("pendingAction.answerFallback") };
  }
  if (action.kind === "form") {
    const isBoardSettings = action.toolName === "configure_board_settings";
    return {
      title: isBoardSettings ? t("pendingAction.boardFormTitle") : t("pendingAction.formTitle"),
      detail: action.detail ?? (isBoardSettings ? t("configureBoardSettings.title") : t("configureApp.title")),
    };
  }
  const tool = action.toolName.replaceAll("_", " ");
  return { title: t("activity.approval"), detail: action.detail ? `${tool} · ${action.detail}` : tool };
};

const PendingActionBanner = ({ pendingAction }: { pendingAction: AssistantPendingAction | undefined }) => {
  const t = useScopedI18n("common.assistant");
  const copy = usePendingActionCopy(pendingAction);
  if (!copy || pendingAction?.kind === "question") return null;

  return (
    <Box component="output" className={classes.pendingActionBanner}>
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color="yellow" radius="xl">
          <IconMessage size={17} />
        </ThemeIcon>
        <Stack gap={0} flex={1} miw={0}>
          <Text size="sm" fw={700}>
            {copy.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {copy.detail}
          </Text>
        </Stack>
        <ThreadPrimitive.ScrollToBottom asChild>
          <Button variant="light" color="yellow" size="compact-sm">
            {t("pendingAction.review")}
          </Button>
        </ThreadPrimitive.ScrollToBottom>
      </Group>
    </Box>
  );
};

const PendingQuestionDock = ({
  pendingAction,
  setTarget,
}: {
  pendingAction: AssistantPendingAction | undefined;
  setTarget: (target: HTMLDivElement | null) => void;
}) => {
  const t = useScopedI18n("common.assistant");
  if (pendingAction?.kind !== "question") return null;

  return (
    <Box component="section" className={classes.pendingQuestionDock} aria-label={t("pendingAction.answerTitle")}>
      <div ref={setTarget} className={classes.pendingQuestionTarget} />
    </Box>
  );
};

const AssistantActivityBar = ({
  isRunning,
  unreadCount,
  latestAssistantText,
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
  | "latestUserText"
  | "latestStatus"
  | "pendingAction"
  | "onOpen"
  | "onDismissActivity"
  | "activityDismissed"
>) => {
  const t = useScopedI18n("common.assistant");
  const pendingCopy = usePendingActionCopy(pendingAction);
  const needsApproval = pendingAction !== undefined || latestStatus?.type === "requires-action";
  const failed = latestStatus?.type === "incomplete" && latestStatus.reason !== "cancelled";
  const visible =
    !activityDismissed &&
    (isRunning || unreadCount > 0 || needsApproval || latestStatus !== undefined || latestAssistantText.length > 0);

  if (!visible) return null;

  const title = isRunning
    ? t("activity.thinking")
    : pendingCopy
      ? pendingCopy.title
      : needsApproval
        ? t("activity.approval")
        : failed
          ? t("activity.failed")
          : t("activity.ready");
  const detail = isRunning
    ? latestUserText || t("activity.working")
    : pendingCopy?.detail || latestAssistantText || (failed ? t("responseError.description") : t("activity.completed"));

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
}

export const AssistantConversationSurface = ({
  isRunning,
  pendingAction,
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  onModelChange,
  onReasoningChange,
  onExpand,
  onMinimize,
}: AssistantConversationSurfaceProps) => {
  const t = useScopedI18n("common.assistant");
  const [questionPortalTarget, setQuestionPortalTarget] = useState<HTMLDivElement | null>(null);

  return (
    <>
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
                <IconMinus size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
      <AssistantQuestionPortalProvider target={questionPortalTarget}>
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
          <PendingQuestionDock pendingAction={pendingAction} setTarget={setQuestionPortalTarget} />
          <PendingActionBanner pendingAction={pendingAction} />
          <Composer
            modelId={modelId}
            models={models}
            modelOptionsLoading={modelOptionsLoading}
            reasoning={reasoning}
            onModelChange={onModelChange}
            onReasoningChange={onReasoningChange}
            pendingAction={pendingAction}
          />
        </ThreadPrimitive.Root>
      </AssistantQuestionPortalProvider>
    </>
  );
};

export const AssistantPanel = ({
  opened,
  onOpen,
  onClose,
  onDismissActivity,
  activityDismissed,
  isRunning,
  unreadCount,
  latestAssistantText,
  latestUserText,
  latestStatus,
  pendingAction,
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  onModelChange,
  onReasoningChange,
}: AssistantPanelProps) => {
  const t = useScopedI18n("common.assistant");
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useWindowEvent("keydown", (event) => {
    if (opened && event.key === "Escape") onClose();
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
      {!opened && (
        <AssistantActivityBar
          onOpen={onOpen}
          onDismissActivity={onDismissActivity}
          activityDismissed={activityDismissed}
          isRunning={isRunning}
          unreadCount={unreadCount}
          latestAssistantText={latestAssistantText}
          latestUserText={latestUserText}
          latestStatus={latestStatus}
          pendingAction={pendingAction}
        />
      )}
      {opened && (
        <FocusTrap active>
          <dialog className={classes.floatingPanel} aria-label={t("title")} open>
            <AssistantConversationSurface
              isRunning={isRunning}
              pendingAction={pendingAction}
              modelId={modelId}
              models={models}
              modelOptionsLoading={modelOptionsLoading}
              reasoning={reasoning}
              onModelChange={onModelChange}
              onReasoningChange={onReasoningChange}
              onMinimize={onClose}
            />
          </dialog>
        </FocusTrap>
      )}
    </>
  );
};
