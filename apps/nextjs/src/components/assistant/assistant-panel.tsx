"use client";

import type { ComponentPropsWithoutRef, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  EmptyMessagePartProps,
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
  ActionBarMorePrimitive,
  AuiIf,
  AttachmentPrimitive,
  BranchPickerPrimitive,
  ChainOfThoughtByIndicesProvider,
  ChainOfThoughtPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SelectionToolbarPrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useMessagePartText,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  unstable_useTriggerPopoverScopeContext,
} from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";
import type { DirectiveChipProps } from "@assistant-ui/react-lexical";
import { MarkdownTextPrimitive, unstable_memoizeMarkdownComponents } from "@assistant-ui/react-markdown";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Combobox,
  Divider,
  Group,
  Image,
  Loader,
  Popover,
  Progress,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useCombobox,
  useComputedColorScheme,
} from "@mantine/core";
import { useReducedMotion, useWindowEvent } from "@mantine/hooks";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconApps,
  IconArrowUp,
  IconArrowsMaximize,
  IconAt,
  IconBattery1,
  IconBattery3,
  IconBatteryFilled,
  IconBatteryOff,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconDownload,
  IconDotsVertical,
  IconFile,
  IconFileExport,
  IconLink,
  IconMessage,
  IconMinus,
  IconPaperclip,
  IconPalette,
  IconPencil,
  IconPhoto,
  IconHistory,
  IconPlayerStop,
  IconPlus,
  IconQuote,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconShieldCheck,
  IconThumbDown,
  IconThumbUp,
  IconTool,
  IconTrash,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "@tabler/icons-react";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";

import { clientApi, fetchApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import { assistantProviderIds, assistantProviderPresets, assistantReasoningModes } from "@homarr/definitions";
import type { AssistantProvider } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

import classes from "./assistant-panel.module.css";
import { getAssistantActivityState } from "./assistant-activity-state";
import { useAssistantAutoApproval, useAssistantAutomaticAction } from "./assistant-auto-approval";
import {
  buildAssistantConversationMarkdown,
  buildAssistantMessageMarkdown,
  getAssistantConversationExportFilename,
} from "./assistant-conversation-export";
import { AssistantDotMatrix } from "./assistant-dot-matrix";
import { useAssistantPreferences } from "./assistant-context";
import { AssistantImage } from "./assistant-image";
import { getAssistantDirectiveTranslationKey, parseAssistantDirectives } from "./assistant-directives";
import { remarkAssistantDirectives, resolveAssistantDirectiveEntity } from "./assistant-markdown-directives";
import type { AssistantDirectiveEntity } from "./assistant-markdown-directives";
import { normalizeAssistantMarkdown } from "./assistant-markdown";
import { getSafeAssistantAttachmentImageSource, getSafeAssistantMarkdownImageSource } from "./assistant-markdown-image";
import {
  getAssistantContextBreakdown,
  getAssistantConversationUsage,
  getAssistantTelemetry,
} from "./assistant-message-metadata";
import type { AssistantContextBreakdown, AssistantConversationTurnUsage } from "./assistant-message-metadata";
import { assistantMessageGroupBy } from "./assistant-message-grouping";
import type { AssistantPendingAction } from "./assistant-pending-action";
import { AssistantQuestionPortalProvider } from "./assistant-question-portal";
import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";
import { useAssistantReasoningState } from "./assistant-reasoning-state";
import { getNearestTriggerScrollTop } from "./assistant-trigger-scroll";
import { getToolResultPresentation } from "./assistant-tool-result";
import { getAssistantIconSearchQuery } from "./assistant-tool-label";
import { getAssistantProviderQuotaLevel, isAssistantProviderUnavailable } from "./assistant-provider-quota";
import { getAssistantToolTraceTarget } from "./assistant-tool-trace";
import { getSafeAssistantHttpUrl } from "./assistant-url";
import { isEscapeOwnedByNestedOverlay } from "../board/advanced-focus/escape";

// Shiki's web grammar bundle is intentionally loaded only when a settled response contains a code
// block. Most assistant conversations never need it, so it should not inflate the global dashboard
// shell merely because the assistant provider is mounted.
const ShikiHighlighter = lazy(() => import("react-shiki/web"));

export interface AssistantConversationControls {
  modelId: string | null;
  models: AssistantRuntimeModelOption[];
  modelOptionsLoading: boolean;
  reasoning: AssistantReasoningMode;
  isRefreshing: boolean;
  autoFocusComposer?: boolean;
  onRefresh: () => Promise<void>;
  onModelChange: (modelId: string) => void;
  onReasoningChange: (reasoning: AssistantReasoningMode) => void;
}

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

const markdownRemarkPlugins = [remarkDirective, remarkAssistantDirectives, remarkGfm, remarkBreaks];

const contextIcons = {
  app: IconApps,
  integration: IconLink,
  board: IconMessage,
  widget: IconTool,
  tool: IconTool,
  tools: IconTool,
};

const ContextDirectiveChip = ({
  directiveId,
  directiveType,
  label,
  iconUrl,
}: DirectiveChipProps & { iconUrl?: string }) => {
  const t = useI18n("assistant");
  const Icon = contextIcons[directiveType as keyof typeof contextIcons] ?? IconAt;
  const safeIconUrl = getSafeAssistantMarkdownImageSource(iconUrl);
  const translationKey = getAssistantDirectiveTranslationKey(directiveType);
  const typeLabel = t(`mentions.${translationKey}`);

  return (
    <span
      className={classes.directiveChip}
      data-directive-type={directiveType}
      data-directive-id={directiveId}
      title={`${typeLabel}: ${label}`}
    >
      {safeIconUrl ? (
        <img className={classes.directiveChipImage} src={safeIconUrl} alt="" aria-hidden referrerPolicy="no-referrer" />
      ) : (
        <Icon size={12} aria-hidden />
      )}
      <span className={classes.directiveChipLabel}>{label}</span>
    </span>
  );
};

const getInternalAssistantHref = (href: string) => {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (typeof window === "undefined" || !URL.canParse(href)) return null;
  const url = new URL(href);
  return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
};

const hasModifiedLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) =>
  event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

const MarkdownLink = ({ href, children, onClick, onMouseEnter, ...props }: ComponentPropsWithoutRef<"a">) => {
  const router = useRouter();
  const httpLink = href !== undefined && /^https?:\/\//iu.test(href);
  const relativeLink = href?.startsWith("/") && !href.startsWith("//");
  const safeLink = href?.startsWith("#") || href?.startsWith("mailto:") || httpLink || relativeLink;

  if (!href || !safeLink) return <span>{children}</span>;

  return (
    <a
      href={href}
      target={httpLink ? "_blank" : undefined}
      rel={httpLink ? "noreferrer" : undefined}
      {...props}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        const internalHref = getInternalAssistantHref(href);
        if (internalHref) router.prefetch(internalHref);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || hasModifiedLinkClick(event)) return;
        const internalHref = getInternalAssistantHref(href);
        if (!internalHref) return;
        event.preventDefault();
        router.push(internalHref);
      }}
    >
      {children}
    </a>
  );
};

const MarkdownTable = ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
  <div className={classes.markdownTableWrap}>
    <table {...props}>{children}</table>
  </div>
);

const MarkdownImage = ({ src, alt = "", ...props }: ComponentPropsWithoutRef<"img">) => {
  const t = useI18n("assistant.image");
  const safeSource = getSafeAssistantMarkdownImageSource(src);
  if (!safeSource) return null;

  return (
    <AssistantImage
      {...props}
      source={safeSource}
      alt={alt}
      className={classes.markdownImage}
      loadingLabel={t("loading")}
      failedLabel={t("failed")}
      retryLabel={t("retry")}
    />
  );
};

const AssistantSyntaxHighlighter = ({ code, components, language }: SyntaxHighlighterProps) => {
  const colorScheme = useComputedColorScheme("light");
  const streaming = useAuiState((state) => state.part.status?.type === "running");
  const Pre = components.Pre;
  const Code = components.Code;
  if (streaming) {
    return (
      <Pre>
        <Code>{code}</Code>
      </Pre>
    );
  }

  return (
    <Suspense
      fallback={
        <Pre>
          <Code>{code}</Code>
        </Pre>
      }
    >
      <ShikiHighlighter
        className={classes.syntaxHighlighter}
        language={language === "unknown" ? "text" : language}
        theme={colorScheme === "dark" ? "github-dark" : "github-light"}
        showLanguage={false}
        addDefaultStyles={false}
      >
        {code}
      </ShikiHighlighter>
    </Suspense>
  );
};

const MermaidDiagram = ({ code, components }: SyntaxHighlighterProps) => {
  const t = useI18n("assistant");
  const colorScheme = useComputedColorScheme("light");
  const diagramId = `assistant-mermaid-${useId().replaceAll(/[^A-Za-z0-9_-]/gu, "")}`;
  const [rendered, setRendered] = useState<{ code: string; svg?: string; failed?: boolean }>({ code });

  useEffect(() => {
    let active = true;
    setRendered({ code });
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: colorScheme === "dark" ? "dark" : "neutral",
          fontFamily: "Inter, system-ui, sans-serif",
        });
        return await mermaid.render(diagramId, code);
      })
      .then(({ svg }) => {
        if (active) setRendered({ code, svg });
      })
      .catch(() => {
        document.getElementById(`d${diagramId}`)?.remove();
        if (active) setRendered({ code, failed: true });
      });

    return () => {
      active = false;
    };
  }, [code, colorScheme, diagramId]);

  if (rendered.code !== code || (!rendered.svg && !rendered.failed)) {
    return (
      <Group component="output" className={classes.mermaidStatus} gap="xs">
        <Loader type="bars" size="xs" />
        <Text size="xs" c="dimmed">
          {t("markdown.renderingDiagram")}
        </Text>
      </Group>
    );
  }
  if (rendered.failed || !rendered.svg) {
    const Pre = components.Pre;
    const Code = components.Code;
    return (
      <Box className={classes.mermaidFallback}>
        <Text size="xs" c="dimmed" mb="xs">
          {t("markdown.diagramUnavailable")}
        </Text>
        <Pre>
          <Code>{code}</Code>
        </Pre>
      </Box>
    );
  }
  return (
    <Box
      component="figure"
      className={classes.mermaidDiagram}
      aria-label={t("markdown.diagram")}
      dangerouslySetInnerHTML={{ __html: rendered.svg }}
    />
  );
};

type MarkdownSpanProps = ComponentPropsWithoutRef<"span"> & {
  "data-assistant-directive"?: string;
  "data-directive-id"?: string;
  "data-directive-label"?: string;
  "data-directive-type"?: string;
};

interface AssistantDirectiveEntitiesState {
  entities: AssistantDirectiveEntity[];
  isLoading: boolean;
}

const AssistantDirectiveEntitiesContext = createContext<AssistantDirectiveEntitiesState>({
  entities: [],
  isLoading: false,
});

const AssistantDirectiveEntitiesProvider = ({ children }: { children: ReactNode }) => {
  const { data: entities = [], isLoading } = clientApi.assistant.getContextEntities.useQuery(undefined, {
    staleTime: 60_000,
  });

  return (
    <AssistantDirectiveEntitiesContext.Provider value={{ entities, isLoading }}>
      {children}
    </AssistantDirectiveEntitiesContext.Provider>
  );
};

const AssistantMarkdownSpan = ({
  children,
  "data-assistant-directive": assistantDirective,
  "data-directive-id": directiveId,
  "data-directive-label": directiveLabel,
  "data-directive-type": directiveType,
  ...props
}: MarkdownSpanProps) => {
  const { entities } = useContext(AssistantDirectiveEntitiesContext);
  if (assistantDirective === "true" && directiveId && directiveLabel && directiveType) {
    const entity = resolveAssistantDirectiveEntity(entities, {
      id: directiveId,
      label: directiveLabel,
      type: directiveType,
    });
    return (
      <ContextDirectiveChip
        directiveId={entity?.id ?? directiveId}
        directiveType={directiveType}
        label={entity?.label ?? directiveLabel}
        iconUrl={entity?.iconUrl}
      />
    );
  }
  return <span {...props}>{children}</span>;
};

const assistantMarkdownComponents = unstable_memoizeMarkdownComponents({
  a: MarkdownLink,
  img: MarkdownImage,
  span: AssistantMarkdownSpan,
  table: MarkdownTable,
  SyntaxHighlighter: AssistantSyntaxHighlighter,
});

const AssistantTextPart = () => (
  <MarkdownTextPrimitive
    className={classes.messageMarkdown}
    preprocess={normalizeAssistantMarkdown}
    remarkPlugins={markdownRemarkPlugins}
    components={assistantMarkdownComponents}
    componentsByLanguage={{ mermaid: { SyntaxHighlighter: MermaidDiagram } }}
    defer
  />
);

const UserTextPart = () => {
  const { text } = useMessagePartText();
  const { entities } = useContext(AssistantDirectiveEntitiesContext);
  const segments = parseAssistantDirectives(text);
  return (
    <span className={classes.messageText}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") return <span key={`${index}:${segment.text}`}>{segment.text}</span>;
        const entity = resolveAssistantDirectiveEntity(entities, segment);
        return (
          <ContextDirectiveChip
            key={`${index}:${segment.type}:${segment.id}`}
            directiveId={entity?.id ?? segment.id}
            directiveType={segment.type}
            label={entity?.label ?? segment.label}
            iconUrl={entity?.iconUrl}
          />
        );
      })}
    </span>
  );
};

const AttachmentPreview = () => {
  const attachment = useAuiState((state) => state.attachment);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const contentImage = attachment.content?.find((part) => part.type === "image");
  const persistedPreview =
    contentImage?.type === "image"
      ? getSafeAssistantAttachmentImageSource(
          contentImage.image,
          typeof window === "undefined" ? undefined : window.location.origin,
        )
      : null;

  useEffect(() => {
    if (persistedPreview || attachment.type !== "image" || !attachment.file) {
      setFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(attachment.file);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment.file, attachment.type, persistedPreview]);

  const source = persistedPreview ?? filePreview;
  if (source) {
    return <Box component="img" className={classes.attachmentImage} src={source} alt="" aria-hidden />;
  }
  return (
    <Box className={classes.attachmentFileIcon}>
      {attachment.type === "image" ? <IconPhoto size={18} /> : <IconFile size={18} />}
    </Box>
  );
};

const Attachment = ({ removable = false }: { removable?: boolean }) => {
  const t = useI18n("assistant");
  const attachment = useAuiState((state) => state.attachment);
  return (
    <AttachmentPrimitive.Root className={classes.attachment}>
      <AttachmentPreview />
      <Box className={classes.attachmentCopy}>
        <Text size="xs" fw={600} lineClamp={1} className={classes.attachmentName}>
          <AttachmentPrimitive.Name />
        </Text>
        {attachment.contentType && (
          <Text size="xs" truncate className={classes.attachmentType}>
            {attachment.contentType}
          </Text>
        )}
      </Box>
      {attachment.status.type === "running" && <Loader type="bars" size="xs" />}
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
const HiddenMessagePart = () => null;

const ReasoningPart = (_props: ReasoningMessagePartProps) => (
  <AssistantDirectiveEntitiesContext.Provider value={{ entities: [], isLoading: false }}>
    <MarkdownTextPrimitive
      className={`${classes.messageMarkdown} ${classes.reasoningText}`}
      preprocess={normalizeAssistantMarkdown}
      remarkPlugins={markdownRemarkPlugins}
      components={assistantMarkdownComponents}
      componentsByLanguage={{ mermaid: { SyntaxHighlighter: MermaidDiagram } }}
    />
  </AssistantDirectiveEntitiesContext.Provider>
);

const AssistantMessagePending = ({ status }: EmptyMessagePartProps) => {
  const t = useI18n("assistant");
  if (status.type !== "running") return null;

  return (
    <Group component="output" className={classes.messagePending} gap="xs" wrap="nowrap" aria-live="polite">
      <AssistantDotMatrix state="thinking" role="presentation" aria-hidden />
      <Text size="xs" fw={600} c="dimmed">
        {t("activity.thinking")}
      </Text>
    </Group>
  );
};

const ReasoningVisibilityContext = createContext<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}>({ collapsed: false, setCollapsed: () => undefined });

const SourcePart = (source: SourceMessagePartProps) => {
  const safeUrl = getSafeAssistantHttpUrl(source.url);
  const content = (
    <>
      <IconLink size={13} />
      {source.title}
    </>
  );

  return safeUrl ? (
    <Anchor className={classes.source} href={safeUrl} target="_blank" rel="noreferrer" size="xs">
      {content}
    </Anchor>
  ) : (
    <Text component="span" className={classes.source} c="dimmed" size="xs">
      {content}
    </Text>
  );
};

const FilePart = ({ data, filename, mimeType }: FileMessagePartProps) => {
  const t = useI18n("assistant");
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
  const t = useI18n("assistant");
  const source = getSafeAssistantAttachmentImageSource(
    image,
    typeof window === "undefined" ? undefined : window.location.origin,
  );
  if (!source) {
    return (
      <Group className={classes.messageFile} gap="xs" wrap="nowrap">
        <IconAlertTriangle size={16} />
        <Text size="xs">{t("externalImageBlocked")}</Text>
      </Group>
    );
  }
  return (
    <AssistantImage
      messagePart
      source={source}
      alt={filename ?? t("attachedImage")}
      caption={filename}
      className={classes.messageImage}
      loadingLabel={t("image.loading")}
      failedLabel={t("image.failed")}
      retryLabel={t("image.retry")}
    />
  );
};

const formatToolResultValue = (value: string | number | boolean) =>
  typeof value === "number" ? value.toLocaleString() : String(value);

const ToolResultPresentation = ({ result, toolName }: { result: unknown; toolName: string }) => {
  const presentation = getToolResultPresentation(result, { toolName });
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

  if (presentation.type === "icons") {
    if (presentation.items.length === 0) return null;
    const hiddenCount = Math.max(0, presentation.totalCount - presentation.items.length);

    return (
      <Box className={classes.toolResultIconCollection}>
        {presentation.items.map((item) => (
          <Box key={`${item.repository ?? "icon"}-${item.url}`} className={classes.toolResultIconItem}>
            <Box className={classes.toolResultIconPreview}>
              <Image
                src={item.url}
                alt={item.name}
                className={classes.toolResultIconImage}
                fit="contain"
                loading="lazy"
              />
            </Box>
            <Group gap={4} mt="xs" wrap="nowrap" justify="space-between">
              <Text size="xs" fw={650} lineClamp={1} title={item.name}>
                {item.name}
              </Text>
              <Badge size="xs" variant="light" color="gray" flex="0 0 auto">
                {item.variant}
              </Badge>
            </Group>
            {item.repository && (
              <Text size="xs" c="dimmed" lineClamp={1} title={item.repository}>
                {item.repository}
              </Text>
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

const getToolResultNavigation = (result: unknown) => {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return [];

  const record = result as Record<string, unknown>;
  const candidates = [
    { href: record.previewPath, translationKey: "toolNavigation.openPreview" as const },
    { href: record.managementPath, translationKey: "toolNavigation.openWidget" as const },
  ];

  return candidates.filter(
    (candidate): candidate is { href: string; translationKey: (typeof candidate)["translationKey"] } =>
      typeof candidate.href === "string" && candidate.href.startsWith("/") && !candidate.href.startsWith("//"),
  );
};

const ToolResultNavigation = ({ result }: { result: unknown }) => {
  const t = useI18n("assistant");
  const router = useRouter();
  const links = getToolResultNavigation(result);

  if (links.length === 0) return null;

  return (
    <Group className={classes.toolResultNavigation} gap="xs" wrap="wrap">
      {links.map((link) => (
        <Button
          key={`${link.translationKey}-${link.href}`}
          component="a"
          href={link.href}
          size="compact-xs"
          variant="light"
          leftSection={<IconLink size={13} aria-hidden />}
          onMouseEnter={() => router.prefetch(link.href)}
          onFocus={() => router.prefetch(link.href)}
          onClick={(event) => {
            if (hasModifiedLinkClick(event)) return;
            event.preventDefault();
            router.push(link.href);
          }}
        >
          {t(link.translationKey)}
        </Button>
      ))}
    </Group>
  );
};

const ToolResultPreview = ({ result, toolName }: { result: unknown; toolName: string }) => {
  const navigation = getToolResultNavigation(result);
  if (navigation.length === 0) return <ToolResultPresentation result={result} toolName={toolName} />;

  return (
    <Stack gap="xs">
      <ToolResultPresentation result={result} toolName={toolName} />
      <ToolResultNavigation result={result} />
    </Stack>
  );
};

const AgentTraceToolContext = createContext(false);

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
  const t = useI18n("assistant");
  const compact = useContext(AgentTraceToolContext);
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
  const compactPresentation = compact && !awaitingApproval;
  const traceTarget = getAssistantToolTraceTarget(args);
  const iconSearchQuery = getAssistantIconSearchQuery(toolName, args);
  const displayName =
    iconSearchQuery === null
      ? toolName.replaceAll("_", " ")
      : iconSearchQuery.length > 0
        ? t("toolActivity.iconSearch", { query: iconSearchQuery })
        : t("toolActivity.iconBrowse");
  const duration = timing?.completedAt !== undefined ? Math.max(0, timing.completedAt - timing.startedAt) : undefined;
  const autoApprovalInProgress = useAssistantAutomaticAction({
    toolCallId,
    ready: awaitingApproval,
    completed: !awaitingApproval,
    confirm: () => {
      respondToApproval({ approved: true, reason: "Approved automatically by the user." });
    },
  });

  return (
    <Box className={classes.tool} data-compact={compactPresentation || undefined}>
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
            <Box miw={0}>
              <Text size={compactPresentation ? "xs" : "sm"} fw={650} lineClamp={1}>
                {displayName}
              </Text>
              {compactPresentation && traceTarget && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {traceTarget}
                </Text>
              )}
            </Box>
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
          <ToolResultPreview result={args} toolName={toolName} />
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
      {!compactPresentation && successful && result !== undefined && (
        <ToolResultPreview result={result} toolName={toolName} />
      )}
      <Collapse expanded={opened}>
        <Stack gap="xs" mt="sm">
          {compactPresentation && successful && result !== undefined && (
            <ToolResultPreview result={result} toolName={toolName} />
          )}
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

const AgentTraceToolGroup = ({ children }: { children?: ReactNode }) => (
  <AgentTraceToolContext.Provider value>
    <Stack className={classes.agentTraceTools} gap={4}>
      {children}
    </Stack>
  </AgentTraceToolContext.Provider>
);

const ChainOfThoughtLayout = ({ children }: { children?: ReactNode }) => (
  <Stack className={classes.reasoningParts} gap={6}>
    {children}
  </Stack>
);

const AssistantChainOfThought = ({ children }: { children?: ReactNode }) => {
  const t = useI18n("assistant");
  const contentId = useId();
  const { collapsed: preferredCollapsed, setCollapsed: setPreferredCollapsed } = useContext(ReasoningVisibilityContext);
  const { chainStatus, collapsed } = useAssistantReasoningState(preferredCollapsed);
  const running = chainStatus.type === "running";

  return (
    <ChainOfThoughtPrimitive.Root className={classes.reasoning} data-opened={!collapsed || undefined}>
      <ChainOfThoughtPrimitive.AccordionTrigger asChild>
        <UnstyledButton
          className={classes.reasoningToggle}
          type="button"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setPreferredCollapsed(!collapsed)}
        >
          <Group gap="xs" wrap="nowrap">
            {(running || chainStatus.type === "requires-action") && (
              <AssistantDotMatrix state={running ? "thinking" : "waiting"} role="presentation" aria-hidden />
            )}
            <Text size="xs" fw={650} c="dimmed">
              {t("reasoning")}
            </Text>
          </Group>
          <IconChevronDown size={14} className={classes.reasoningChevron} />
        </UnstyledButton>
      </ChainOfThoughtPrimitive.AccordionTrigger>
      <Box id={contentId} className={classes.reasoningContent} aria-busy={running} hidden={collapsed}>
        <ChainOfThoughtLayout>{children}</ChainOfThoughtLayout>
      </Box>
    </ChainOfThoughtPrimitive.Root>
  );
};

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

const downloadAssistantMarkdown = (markdown: string, filename: string) => {
  const blobUrl = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
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

const getAssistantProviderPreset = (provider: string) => {
  if (!assistantProviderIds.includes(provider as AssistantProvider)) return null;
  return assistantProviderPresets[provider as AssistantProvider];
};

const ProviderIcon = ({ provider, size = 16 }: { provider: string; size?: number }) => {
  const colorScheme = useComputedColorScheme("light");
  const preset = getAssistantProviderPreset(provider);
  const source = colorScheme === "dark" && preset && "darkIconUrl" in preset ? preset.darkIconUrl : preset?.iconUrl;

  return source ? (
    <Box component="img" className={classes.providerIcon} src={source} alt="" aria-hidden w={size} h={size} />
  ) : (
    <IconRobot size={size} aria-hidden />
  );
};

const ProviderMessageInfo = () => {
  const metadata = useAuiState((state) => state.message.metadata);
  const telemetry = getAssistantTelemetry(metadata);
  if (!telemetry) return null;

  const details = [
    telemetry.modelId,
    telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
    telemetry.outputTokensPerSecond !== undefined ? `${telemetry.outputTokensPerSecond.toFixed(1)} tok/s` : undefined,
    telemetry.cost !== undefined ? formatCost(telemetry.cost) : undefined,
  ].filter(Boolean);

  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={700} tt="capitalize">
            {telemetry.provider}
          </Text>
          <Text size="xs">{details.join(" · ")}</Text>
        </Stack>
      }
      multiline
      maw="min(24rem, calc(100vw - 2rem))"
    >
      <Box
        component="span"
        className={classes.providerAction}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the logo and its focused tooltip form one labelled image
        role="img"
        tabIndex={0}
        aria-label={`${telemetry.provider}: ${telemetry.modelId}`}
      >
        <ProviderIcon provider={telemetry.provider} />
      </Box>
    </Tooltip>
  );
};

const ConversationTurn = ({
  index,
  messageId,
  threadId,
  turn,
}: {
  index: number;
  messageId?: string;
  threadId?: string;
  turn: AssistantConversationTurnUsage;
}) => {
  const t = useI18n("assistant");
  const detailsId = useId();
  const [opened, setOpened] = useState(false);
  const generationQuery = clientApi.assistant.getGenerationTelemetry.useQuery(
    { threadId: threadId ?? "", messageId: messageId ?? "" },
    {
      enabled: opened && turn.provider === "openrouter" && Boolean(threadId) && Boolean(messageId),
      refetchInterval: (query) =>
        query.state.data?.complete === false && query.state.dataUpdateCount < 6 ? 1500 : false,
      retry: 2,
      staleTime: (query) => (query.state.data?.complete ? 5 * 60_000 : 0),
    },
  );
  const generationById = new Map(
    generationQuery.data?.generations.flatMap((generation) =>
      generation.generationId ? [[generation.generationId, generation] as const] : [],
    ) ?? [],
  );
  const steps = turn.telemetry.steps.map((step) => ({
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
    ...turn.usage,
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
    ...turn.telemetry,
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
          ...(turn.telemetry.contextLength
            ? { contextUtilization: Math.min(providerContextUsed / turn.telemetry.contextLength, 1) }
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
  const displayedThroughput = telemetry.providerOutputTokensPerSecond ?? telemetry.outputTokensPerSecond;

  return (
    <Box className={classes.conversationTurn} data-opened={opened || undefined}>
      <UnstyledButton
        className={classes.conversationTurnTrigger}
        aria-expanded={opened}
        aria-controls={detailsId}
        onClick={() => setOpened((value) => !value)}
      >
        <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Box className={classes.conversationTurnProvider}>
              <ProviderIcon provider={turn.provider} size={15} />
            </Box>
            <Box miw={0}>
              <Text size="xs" fw={650} truncate>
                {t("usage.step", { number: index + 1 })} · {turn.modelId}
              </Text>
              <Text size="xs" c="dimmed">
                {[
                  telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
                  displayedThroughput !== undefined ? `${displayedThroughput.toFixed(1)} tok/s` : undefined,
                  usage.totalTokens !== undefined
                    ? `${usage.totalTokens.toLocaleString()} ${t("usage.tokens")}`
                    : undefined,
                  telemetry.cost !== undefined ? formatCost(telemetry.cost) : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("usage.notReported")}
              </Text>
            </Box>
          </Group>
          <IconChevronDown size={14} className={classes.disclosureIcon} data-opened={opened || undefined} />
        </Group>
      </UnstyledButton>
      <Collapse id={detailsId} expanded={opened}>
        <Stack gap="sm" pt="sm">
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
            {[
              [t("usage.input"), usage.inputTokens?.toLocaleString()],
              [t("usage.output"), usage.outputTokens?.toLocaleString()],
              [t("usage.cached"), usage.cachedInputTokens?.toLocaleString()],
              [t("usage.reasoning"), usage.reasoningTokens?.toLocaleString()],
              [t("usage.cacheWrite"), usage.cacheWriteTokens?.toLocaleString()],
              [t("usage.tokens"), usage.totalTokens?.toLocaleString()],
              [
                t("usage.firstOutput"),
                telemetry.timeToFirstOutputMs !== undefined ? formatDuration(telemetry.timeToFirstOutputMs) : undefined,
              ],
              [
                t("usage.endToEnd"),
                telemetry.durationMs !== undefined ? formatDuration(telemetry.durationMs) : undefined,
              ],
              [
                t("usage.generationTime"),
                telemetry.generationTimeMs !== undefined ? formatDuration(telemetry.generationTimeMs) : undefined,
              ],
              [
                t("usage.providerThroughput"),
                displayedThroughput !== undefined ? `${displayedThroughput.toFixed(1)} tok/s` : undefined,
              ],
              [
                t("usage.cost"),
                telemetry.cost !== undefined
                  ? `${formatCost(telemetry.cost)}${telemetry.costType ? ` · ${t(`usage.${telemetry.costType}`)}` : ""}`
                  : undefined,
              ],
              [
                t("usage.upstreamCost"),
                telemetry.upstreamCost !== undefined ? formatCost(telemetry.upstreamCost) : undefined,
              ],
              [t("usage.fallbacks"), telemetry.fallbackCount?.toLocaleString()],
              [
                t("usage.fallbackLatency"),
                telemetry.fallbackLatencyMs !== undefined ? formatDuration(telemetry.fallbackLatencyMs) : undefined,
              ],
              [
                t("usage.cacheDiscount"),
                telemetry.cacheDiscount !== undefined ? formatCost(telemetry.cacheDiscount) : undefined,
              ],
              [t("usage.webSearches"), telemetry.webSearchRequests?.toLocaleString()],
              [t("usage.finishReason"), telemetry.finishReason],
            ].map(([label, value]) => (
              <div key={label}>
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
                <Text size="sm" fw={600}>
                  {value ?? t("usage.notReported")}
                </Text>
              </div>
            ))}
          </Box>
          {(telemetry.contextUsed !== undefined || telemetry.contextLength !== undefined) && (
            <Text size="xs" c="dimmed">
              {t("usage.contextWindow")}: {telemetry.contextUsed?.toLocaleString() ?? t("usage.notReported")} /{" "}
              {telemetry.contextLength?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          )}
          {steps.length > 0 && (
            <Stack gap={4}>
              <Text size="xs" fw={650}>
                {t("usage.agentSteps")}
              </Text>
              {steps.map((step) => (
                <Box key={step.index} className={classes.stepRow}>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="xs" fw={600}>
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
                      step.fallbackCount !== undefined
                        ? `${t("usage.fallbacks")} ${step.fallbackCount.toLocaleString()}`
                        : undefined,
                      step.fallbackLatencyMs !== undefined
                        ? `${t("usage.fallbackLatency")} ${formatDuration(step.fallbackLatencyMs)}`
                        : undefined,
                      step.nativeFinishReason,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("usage.notReported")}
                  </Text>
                  {(step.normalizedInputTokens !== undefined || step.normalizedOutputTokens !== undefined) && (
                    <Text size="xs" c="dimmed">
                      {t("usage.normalizedTokens")}: {step.normalizedInputTokens?.toLocaleString() ?? "–"} /{" "}
                      {step.normalizedOutputTokens?.toLocaleString() ?? "–"}
                    </Text>
                  )}
                  {(step.routerStrategy || step.routerRegion || step.serviceTier || step.dataRegion || step.isByok) && (
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
      </Collapse>
    </Box>
  );
};

const ConversationContextBreakdown = ({ breakdown }: { breakdown: AssistantContextBreakdown }) => {
  const t = useI18n("assistant");
  const hasContext = breakdown.percentage !== undefined;
  const categories = [
    { label: t("usage.input"), value: breakdown.inputTokens },
    { label: t("usage.cached"), value: breakdown.cachedInputTokens },
    { label: t("usage.output"), value: breakdown.outputTokens },
    { label: t("usage.reasoning"), value: breakdown.reasoningTokens },
  ];

  return (
    <Box className={classes.contextBreakdown}>
      <RingProgress
        className={classes.contextBreakdownRing}
        size={76}
        thickness={7}
        roundCaps
        sections={
          hasContext ? [{ value: breakdown.percentage ?? 0, color: getContextColor(breakdown.percentage ?? 0) }] : []
        }
        label={
          <Text ta="center" size="xs" fw={700}>
            {hasContext ? `${breakdown.percentage}%` : "–"}
          </Text>
        }
      />
      <Box className={classes.contextBreakdownWindow}>
        {[
          { label: t("usage.used"), value: breakdown.contextUsed },
          { label: t("usage.remaining"), value: breakdown.remaining },
          { label: t("usage.capacity"), value: breakdown.contextLength },
        ].map((item) => (
          <Box key={item.label}>
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
            <Text size="sm" fw={650}>
              {item.value?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </Box>
        ))}
      </Box>
      <Box className={classes.contextBreakdownCategories}>
        {categories.map((category) => (
          <Box key={category.label}>
            <Text size="xs" c="dimmed">
              {category.label}
            </Text>
            <Text size="xs" fw={650}>
              {category.value?.toLocaleString() ?? t("usage.notReported")}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const ConversationContext = () => {
  const t = useI18n("assistant");
  const [opened, setOpened] = useState(false);
  const messages = useAuiState((state) => state.thread.messages);
  const threadId = useAuiState((state) => state.threadListItem.remoteId);
  const metadata = useMemo(() => messages.map((message) => message.metadata), [messages]);
  const messageIdByRequestId = useMemo(
    () =>
      new Map(
        messages.flatMap((message) => {
          const telemetry = getAssistantTelemetry(message.metadata);
          return telemetry ? [[telemetry.requestId, message.id] as const] : [];
        }),
      ),
    [messages],
  );
  const usage = useMemo(() => getAssistantConversationUsage(metadata), [metadata]);
  const breakdown = useMemo(() => getAssistantContextBreakdown(usage), [usage]);
  const hasTokenUsage = usage.turns.some((turn) => turn.totalTokens !== undefined);
  const hasCost = usage.turns.some((turn) => turn.cost !== undefined);
  const hasContext = breakdown.percentage !== undefined;
  const contextPercentage = breakdown.percentage ?? 0;
  const quickLabel = [
    hasTokenUsage ? `${usage.totalTokens.toLocaleString()} ${t("usage.tokens")}` : undefined,
    hasCost ? formatCost(usage.cost) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width="min(28rem, calc(100vw - 1rem))"
      position="top-end"
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.composerContext}
          type="button"
          aria-label={quickLabel ? `${t("usage.contextWindow")}: ${quickLabel}` : t("usage.contextWindow")}
          title={quickLabel || t("usage.contextWindow")}
          aria-expanded={opened}
          aria-haspopup="dialog"
          onClick={() => setOpened((value) => !value)}
        >
          <Group gap={5} wrap="nowrap">
            <RingProgress
              size={22}
              thickness={3}
              roundCaps
              sections={hasContext ? [{ value: contextPercentage, color: getContextColor(contextPercentage) }] : []}
            />
            <Text className={classes.composerContextLabel} component="span" size="xs" fw={650}>
              {hasContext ? `${contextPercentage}%` : t("mentions.context")}
            </Text>
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown className={classes.conversationContextPopover}>
        <Stack gap="sm">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Box miw={0}>
              <Text size="sm" fw={700}>
                {t("usage.contextWindow")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("usage.requestDetails")}
              </Text>
            </Box>
            {hasContext && (
              <Badge size="sm" variant="light" color={getContextColor(contextPercentage)}>
                {contextPercentage}%
              </Badge>
            )}
          </Group>
          <Box className={classes.conversationUsageSummary}>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.tokens")}
              </Text>
              <Text size="sm" fw={650}>
                {hasTokenUsage ? usage.totalTokens.toLocaleString() : t("usage.notReported")}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.cost")}
              </Text>
              <Text size="sm" fw={650}>
                {hasCost ? formatCost(usage.cost) : t("usage.notReported")}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                {t("usage.agentSteps")}
              </Text>
              <Text size="sm" fw={650}>
                {usage.turns.reduce((total, turn) => total + turn.telemetry.steps.length, 0).toLocaleString()}
              </Text>
            </div>
          </Box>
          <ConversationContextBreakdown breakdown={breakdown} />
          <Divider />
          <ScrollArea.Autosize mah="min(14rem, 30dvh)" type="auto" offsetScrollbars>
            <Stack gap={5}>
              {usage.turns.length === 0 ? (
                <Text size="sm" c="dimmed" py="xs">
                  {t("usage.notReported")}
                </Text>
              ) : (
                usage.turns.map((turn, index) => (
                  <ConversationTurn
                    key={turn.requestId}
                    index={index}
                    turn={turn}
                    threadId={threadId ?? undefined}
                    messageId={messageIdByRequestId.get(turn.requestId)}
                  />
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
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

const HistorySelectContext = createContext<() => void>(() => undefined);

const ThreadListItem = () => {
  const t = useI18n("assistant");
  const actionT = useI18n("common.action");
  const aui = useAui();
  const onSelect = useContext(HistorySelectContext);
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const title = useAuiState((state) => state.threadListItem.title);
  const [exporting, setExporting] = useState(false);
  const [actionsOpened, setActionsOpened] = useState(false);
  const [renameOpened, setRenameOpened] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nextTitle, setNextTitle] = useState(title ?? "");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameOpened) renameInputRef.current?.focus();
  }, [renameOpened]);

  const exportConversation = async () => {
    if (!remoteId || exporting) return;
    setExporting(true);
    try {
      const conversation = await fetchApi.assistant.getThread.query({ threadId: remoteId });
      const markdown = buildAssistantConversationMarkdown(conversation);
      downloadAssistantMarkdown(
        markdown,
        getAssistantConversationExportFilename(conversation.thread.title ?? title, remoteId),
      );
    } catch {
      showErrorNotification({
        title: t("exportConversation.failedTitle"),
        message: t("exportConversation.failedDescription"),
      });
    } finally {
      setExporting(false);
    }
  };

  const renameConversation = async () => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle || renaming) return;
    setRenaming(true);
    try {
      await aui.threadListItem().rename(trimmedTitle);
      setRenameOpened(false);
      setActionsOpened(false);
    } catch {
      showErrorNotification({
        title: t("renameConversation.failedTitle"),
        message: t("renameConversation.failedDescription"),
      });
    } finally {
      setRenaming(false);
    }
  };

  const deleteConversation = async () => {
    try {
      await aui.threadListItem().delete();
    } catch {
      showErrorNotification({
        title: t("deleteConversation.failedTitle"),
        message: t("deleteConversation.failedDescription"),
      });
    }
  };

  if (renameOpened) {
    return (
      <ThreadListItemPrimitive.Root className={classes.historyItem}>
        <TextInput
          ref={renameInputRef}
          className={classes.historyRenameInput}
          value={nextTitle}
          onChange={(event) => setNextTitle(event.currentTarget.value)}
          aria-label={t("renameConversation.label")}
          maxLength={72}
          size="xs"
          onKeyDown={(event) => {
            if (event.key === "Enter") void renameConversation();
            if (event.key === "Escape" && !renaming) setRenameOpened(false);
          }}
        />
        <ActionIcon
          variant="subtle"
          color="green"
          size="sm"
          aria-label={t("renameConversation.save")}
          disabled={!nextTitle.trim()}
          loading={renaming}
          loaderProps={{ type: "bars" }}
          onClick={() => void renameConversation()}
        >
          <IconCheck size={15} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={actionT("cancel")}
          disabled={renaming}
          onClick={() => setRenameOpened(false)}
        >
          <IconX size={15} />
        </ActionIcon>
      </ThreadListItemPrimitive.Root>
    );
  }

  return (
    <ThreadListItemPrimitive.Root className={classes.historyItem}>
      <ThreadListItemPrimitive.Trigger asChild>
        <UnstyledButton className={classes.historyItemTrigger} title={title} onClick={onSelect}>
          <Text component="span" size="sm" fw={500} truncate>
            <ThreadListItemPrimitive.Title fallback={t("newConversation")} />
          </Text>
        </UnstyledButton>
      </ThreadListItemPrimitive.Trigger>
      {actionsOpened && (
        <Group className={classes.historyItemActions} gap={1} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            title={t("renameConversation.action")}
            aria-label={t("renameConversation.action")}
            onClick={() => {
              setNextTitle(title ?? "");
              setRenameOpened(true);
            }}
          >
            <IconPencil size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            loading={exporting}
            loaderProps={{ type: "bars" }}
            disabled={!remoteId}
            title={t("exportConversation.action")}
            aria-label={t("exportConversation.action")}
            onClick={() => void exportConversation()}
          >
            <IconFileExport size={14} />
          </ActionIcon>
          <InlineConfirmActionIcon
            variant="subtle"
            color="red"
            size="sm"
            title={actionT("delete")}
            aria-label={actionT("delete")}
            confirmLabel={t("deleteConversation.description", { title: title ?? t("newConversation") })}
            confirmationAriaLabel={t("deleteConversation.title")}
            confirmationChildren={<IconCheck size={14} />}
            onConfirm={deleteConversation}
          >
            <IconTrash size={14} />
          </InlineConfirmActionIcon>
        </Group>
      )}
      <ActionIcon
        className={classes.historyItemMenu}
        variant="subtle"
        color="gray"
        size="sm"
        title={t("conversationActions")}
        aria-label={t("conversationActions")}
        aria-expanded={actionsOpened}
        onClick={() => setActionsOpened((current) => !current)}
      >
        {actionsOpened ? <IconX size={15} /> : <IconDotsVertical size={15} />}
      </ActionIcon>
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadHistory = ({ onSelect }: { onSelect: () => void }) => {
  const t = useI18n("assistant");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const threadItems = useAuiState((state) => state.threads.threadItems);
  const hasMatchingConversation = threadItems.some((item) => {
    const itemTitle = item.title ?? t("newConversation");
    return itemTitle.toLocaleLowerCase().includes(normalizedQuery);
  });
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
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          leftSection={<IconSearch size={15} />}
          placeholder={t("searchConversations")}
          aria-label={t("searchConversations")}
          size="xs"
        />
        <ScrollArea.Autosize mah="min(24rem, 55dvh)" type="auto" scrollbars="y" offsetScrollbars>
          <Stack gap={3}>
            <ThreadListPrimitive.Items>
              {({ threadListItem }) => {
                const itemTitle = threadListItem.title ?? t("newConversation");
                if (normalizedQuery && !itemTitle.toLocaleLowerCase().includes(normalizedQuery)) return null;
                return <ThreadListItem />;
              }}
            </ThreadListPrimitive.Items>
            {normalizedQuery && !hasMatchingConversation && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                {t("noMatchingConversations")}
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </HistorySelectContext.Provider>
  );
};

const ConversationHistory = () => {
  const t = useI18n("assistant");
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
  const t = useI18n("assistant.autoApproval");
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

const ViewRefreshAction = ({
  isRefreshing,
  onRefresh,
}: Pick<AssistantConversationControls, "isRefreshing" | "onRefresh">) => {
  const t = useI18n("assistant.refresh");

  const refresh = async () => {
    try {
      await onRefresh();
      showSuccessNotification({ title: t("completeTitle"), message: t("completeDescription") });
    } catch {
      showErrorNotification({ title: t("failedTitle"), message: t("failedDescription") });
    }
  };

  return (
    <Tooltip label={isRefreshing ? t("working") : t("action")}>
      <ActionIcon
        className={classes.panelAction}
        variant="subtle"
        color="gray"
        loading={isRefreshing}
        loaderProps={{ type: "bars" }}
        onClick={() => void refresh()}
        aria-label={isRefreshing ? t("working") : t("action")}
      >
        <IconRefresh size={17} />
      </ActionIcon>
    </Tooltip>
  );
};

const EmptyThread = () => {
  const t = useI18n("assistant");
  return (
    <ThreadPrimitive.Empty>
      <Box className={classes.empty}>
        <Stack align="center" gap="lg" maw={560} w="100%">
          <Stack align="center" gap="xs" maw={430}>
            <ThemeIcon size={52} radius="xl" variant="light">
              <IconRobot size={27} />
            </ThemeIcon>
            <Text size="xl" fw={700}>
              {t("emptyTitle")}
            </Text>
            <Text size="sm" className={classes.emptyDescription}>
              {t("emptyDescription")}
            </Text>
          </Stack>
          <Box className={classes.suggestions}>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.health.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                className={classes.suggestion}
                leftSection={<IconActivityHeartbeat size={18} />}
              >
                {t("suggestions.health.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.explore.prompt")} send={false} clearComposer asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconApps size={18} />}>
                {t("suggestions.explore.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.media.prompt")} send={false} clearComposer asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconSearch size={18} />}>
                {t("suggestions.media.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.style.prompt")} send={false} clearComposer asChild>
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
  const t = useI18n("assistant");
  const aui = useAui();
  const mentionViewportRef = useRef<HTMLDivElement>(null);
  const slashViewportRef = useRef<HTMLDivElement>(null);
  const { entities, isLoading } = useContext(AssistantDirectiveEntitiesContext);
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

const getModelProviderLabel = (modelId: string, fallback: string) => {
  const separator = modelId.indexOf("/");
  if (separator <= 0) return fallback;
  const provider = modelId
    .slice(0, separator)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replaceAll(/[-_]/gu, " ");
  if (!provider) return fallback;
  return `${provider.charAt(0).toLocaleUpperCase()}${provider.slice(1)}`;
};

const formatCompactModelNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

const RuntimeControls = ({
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  onModelChange,
  onReasoningChange,
}: ComposerProps) => {
  const t = useI18n("assistant");
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
  const groupedModels = visibleModels.reduce((groups, model) => {
    const provider = getModelProviderLabel(model.id, t("runtime.otherModels"));
    const providerModels = groups.get(provider);
    if (providerModels) providerModels.push(model);
    else groups.set(provider, [model]);
    return groups;
  }, new Map<string, AssistantRuntimeModelOption[]>());
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
    <Combobox store={modelCombobox} onOptionSubmit={selectModel} withinPortal position="top-start" width={340}>
      <Combobox.Target>
        <UnstyledButton
          className={classes.runtimeSelectorTrigger}
          type="button"
          disabled={modelOptionsLoading || models.length === 0}
          onClick={() => modelCombobox.toggleDropdown()}
          aria-label={`${t("runtime.model")}: ${selectedModel?.name ?? t("runtime.noModels")}. ${t("runtime.thinking")}: ${t(`runtime.reasoning.${reasoning}`)}`}
          aria-expanded={modelCombobox.dropdownOpened}
        >
          <Group gap="xs" wrap="nowrap">
            {modelOptionsLoading && <Loader size={12} />}
            <Text className={classes.runtimeSelectorName} size="xs" fw={650} lineClamp={1}>
              {selectedModel?.name ?? t("runtime.model")}
            </Text>
            <Badge className={classes.runtimeSelectorEffort} size="xs" variant="light" color="gray">
              {t(`runtime.reasoning.${reasoning}`)}
            </Badge>
            <Combobox.Chevron size="xs" />
          </Group>
        </UnstyledButton>
      </Combobox.Target>
      <Combobox.Dropdown className={classes.modelDropdown}>
        <Combobox.Search
          value={modelSearch}
          onChange={(event) => {
            setModelSearch(event.currentTarget.value);
            modelCombobox.updateSelectedOptionIndex();
          }}
          placeholder={t("runtime.searchModels")}
          aria-label={t("runtime.searchModels")}
          size="xs"
        />
        <Combobox.Options className={classes.modelOptions}>
          {[...groupedModels.entries()].map(([provider, providerModels]) => (
            <Combobox.Group key={provider} label={provider}>
              {providerModels.map((model) => (
                <Combobox.Option
                  className={classes.modelOption}
                  key={model.id}
                  value={model.id}
                  active={model.id === modelId}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Divider
                      className={classes.modelOptionDivider}
                      orientation="vertical"
                      data-active={model.id === modelId || undefined}
                    />
                    <Stack gap={1} className={classes.modelOptionText}>
                      <Text size="sm" fw={model.id === modelId ? 650 : 500} lineClamp={1}>
                        {model.name}
                      </Text>
                      <Text size="xs" className={classes.modelOptionDescription} lineClamp={1}>
                        {model.description?.trim() || model.id}
                      </Text>
                    </Stack>
                    <Group className={classes.modelOptionMeta} gap={4} wrap="nowrap">
                      {model.inputModalities.includes("image") && (
                        <Tooltip label={t("runtime.imageInput")}>
                          <IconPhoto size={14} aria-label={t("runtime.imageInput")} />
                        </Tooltip>
                      )}
                      {model.contextLength && (
                        <Badge size="xs" variant="light" color="gray">
                          {formatCompactModelNumber(model.contextLength)}
                        </Badge>
                      )}
                      {model.id === modelId && <IconCheck size={15} className={classes.runtimeOptionCheck} />}
                    </Group>
                  </Group>
                </Combobox.Option>
              ))}
            </Combobox.Group>
          ))}
          {visibleModels.length === 0 && <Combobox.Empty>{t("runtime.noModels")}</Combobox.Empty>}
        </Combobox.Options>
        <Divider />
        <Box className={classes.reasoningSelector}>
          <Text size="xs" fw={650} mb={5}>
            {t("runtime.thinking")}
          </Text>
          <SegmentedControl
            className={classes.reasoningSegmentedControl}
            value={reasoning}
            onChange={(value) => {
              if (assistantReasoningModes.includes(value as AssistantReasoningMode)) {
                onReasoningChange(value as AssistantReasoningMode);
              }
            }}
            size="xs"
            fullWidth
            data={assistantReasoningModes.map((mode) => ({
              value: mode,
              label: t(`runtime.reasoning.${mode}`),
            }))}
          />
        </Box>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const providerQuotaIcons = {
  ok: IconBatteryFilled,
  warning: IconBattery3,
  bad: IconBattery1,
  dead: IconBatteryOff,
};

const providerQuotaColors = {
  ok: "green",
  warning: "yellow",
  bad: "orange",
  dead: "red",
} as const;

const HomarrProviderQuota = () => {
  const t = useI18n("assistant");
  const locale = useCurrentIntlLocale();
  const preferences = useAssistantPreferences();
  const quota = preferences.quota;
  const resetAt = useMemo(() => new Date(quota?.resetsAt ?? Date.now()), [quota?.resetsAt]);
  const resetRelative = useTimeAgo(resetAt, 30_000);
  if (preferences.provider !== "homarr") return null;

  const level = preferences.quota ? getAssistantProviderQuotaLevel(preferences.quota) : "dead";
  const Icon = providerQuotaIcons[level];
  const color = providerQuotaColors[level];
  const percentage = preferences.quota
    ? Math.min(100, Math.max(0, (preferences.quota.remaining / Math.max(preferences.quota.limit, 1)) * 100))
    : 0;
  const label = preferences.providerUser
    ? quota
      ? t("providerQuota.remainingLabel", {
          remaining: quota.remaining,
          limit: quota.limit,
        })
      : t("providerQuota.loading")
    : t("providerQuota.signInRequired");
  const resetTime = quota ? (
    <time dateTime={quota.resetsAt} title={new Date(quota.resetsAt).toLocaleString(locale)}>
      {new Date(quota.resetsAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })}
    </time>
  ) : null;

  return (
    <Popover position="top" width={290} shadow="md" withinPortal>
      <Popover.Target>
        <UnstyledButton className={classes.providerQuotaTrigger} data-level={level} type="button" aria-label={label}>
          {preferences.quotaLoading && !preferences.quota ? <Loader size={14} /> : <Icon size={16} aria-hidden />}
          <Text component="span" size="xs" fw={650}>
            {preferences.quota?.remaining ?? "–"}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon color={color} variant="light" size="sm" radius="xl">
                <Icon size={15} aria-hidden />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={700}>
                  {t("providerQuota.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {preferences.providerUser?.name || t("providerQuota.communityWorkshop")}
                </Text>
              </Box>
            </Group>
            {preferences.quota && (
              <Badge color={color} variant="light" size="sm">
                {t(`providerQuota.level.${level}`)}
              </Badge>
            )}
          </Group>

          {!preferences.providerUser ? (
            <>
              <Text size="sm" c="dimmed">
                {t("providerQuota.signInDescription")}
              </Text>
              <Button
                size="compact-sm"
                loading={preferences.quotaLoading}
                onClick={() => void preferences.signInToProvider().catch(() => undefined)}
              >
                {t("providerQuota.signIn")}
              </Button>
            </>
          ) : preferences.quota ? (
            <>
              <Box>
                <Group justify="space-between" gap="xs" mb={5}>
                  <Text size="xs" c="dimmed">
                    {t("providerQuota.dailyAllowance")}
                  </Text>
                  <Text size="xs" fw={650}>
                    {preferences.quota.remaining} / {preferences.quota.limit}
                  </Text>
                </Group>
                <Progress value={percentage} color={color} size="sm" aria-label={label} />
              </Box>
              <Text size="xs" c="dimmed">
                {t.rich("providerQuota.reset", {
                  relative: resetRelative,
                  time: () => resetTime,
                })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("providerQuota.toolCalls")}
              </Text>
            </>
          ) : (
            <Button
              variant="light"
              size="compact-sm"
              loading={preferences.quotaLoading}
              onClick={() => void preferences.refreshQuota()}
            >
              {t("providerQuota.retry")}
            </Button>
          )}
          {preferences.quotaError && (
            <Text size="xs" c="red">
              {preferences.quotaError}
            </Text>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

const Composer = (props: ComposerProps) => {
  const t = useI18n("assistant");
  const preferences = useAssistantPreferences();
  const running = useAuiState((state) => state.thread.isRunning);
  const hasPendingAction = props.pendingAction !== undefined;
  const providerUnavailable = isAssistantProviderUnavailable({
    provider: preferences.provider,
    signedIn: preferences.providerUser !== null,
    remaining: preferences.quota?.remaining,
  });
  const sendBlocked = hasPendingAction || providerUnavailable;
  const composerInputRef = useRef<HTMLDivElement>(null);
  const composerLabel = t("composerPlaceholder");

  useLayoutEffect(() => {
    const editor = composerInputRef.current?.querySelector<HTMLElement>(".aui-lexical-input");
    if (!editor) return;
    editor.setAttribute("aria-label", composerLabel);
    return () => {
      if (editor.getAttribute("aria-label") === composerLabel) editor.removeAttribute("aria-label");
    };
  }, [composerLabel]);

  return (
    <Box className={classes.composerWrap}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.AttachmentDropzone className={classes.composerDropzone}>
          <ComposerPrimitive.Root
            className={classes.composer}
            data-pending-action={hasPendingAction || undefined}
            onSubmit={(event) => {
              if (sendBlocked) event.preventDefault();
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
              <LexicalComposerInput
                ref={composerInputRef}
                className={classes.composerInput}
                data-assistant-composer-input
                placeholder={composerLabel}
                directiveChip={ContextDirectiveChip}
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- opening the assistant is an explicit intent to compose
                autoFocus={props.autoFocusComposer}
                data-autofocus={props.autoFocusComposer ? true : undefined}
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
                    variant="filled"
                    size="lg"
                    aria-label={
                      hasPendingAction
                        ? t("pendingAction.sendBlocked")
                        : providerUnavailable
                          ? t("providerQuota.unavailableDescription")
                          : t("send")
                    }
                    disabled={sendBlocked}
                  >
                    <IconArrowUp size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Send>
              )}
            </Group>
            <Group className={classes.composerFooter} justify="space-between" gap="xs" wrap="nowrap">
              <Group className={classes.composerControls} gap={5} wrap="nowrap">
                <RuntimeControls {...props} />
                <HomarrProviderQuota />
                <ConversationContext />
              </Group>
            </Group>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </Box>
  );
};

const usePendingActionCopy = (action: AssistantPendingAction | undefined) => {
  const t = useI18n("assistant");
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
  const t = useI18n("assistant");
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
  const t = useI18n("assistant");
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
  const activityState = getAssistantActivityState({
    isRunning,
    latestPartType: latestAssistantPartType,
    needsApproval,
    failed,
  });
  const activityColor = needsApproval ? "yellow" : failed ? "red" : isRunning ? "red" : "green";

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
