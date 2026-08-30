"use client";

import type { ComponentPropsWithoutRef, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { createContext, lazy, Suspense, useContext, useEffect, useId, useState } from "react";
import type {
  EmptyMessagePartProps,
  FileMessagePartProps,
  ImageMessagePartProps,
  ReasoningMessagePartProps,
  SourceMessagePartProps,
} from "@assistant-ui/react";
import { AttachmentPrimitive, useAuiState, useMessagePartText } from "@assistant-ui/react";
import type { DirectiveChipProps } from "@assistant-ui/react-lexical";
import { MarkdownTextPrimitive, unstable_memoizeMarkdownComponents } from "@assistant-ui/react-markdown";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { ActionIcon, Anchor, Box, Group, Loader, Text, useComputedColorScheme } from "@mantine/core";
import {
  IconAlertTriangle,
  IconApps,
  IconAt,
  IconDownload,
  IconFile,
  IconLink,
  IconMessage,
  IconPhoto,
  IconTool,
  IconX,
} from "@tabler/icons-react";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { getAssistantDirectiveTranslationKey, parseAssistantDirectives } from "./assistant-directives";
import { AssistantDotMatrix } from "./assistant-dot-matrix";
import { AssistantImage } from "./assistant-image";
import { remarkAssistantDirectives, resolveAssistantDirectiveEntity } from "./assistant-markdown-directives";
import type { AssistantDirectiveEntity } from "./assistant-markdown-directives";
import { normalizeAssistantMarkdown } from "./assistant-markdown";
import { getSafeAssistantAttachmentImageSource, getSafeAssistantMarkdownImageSource } from "./assistant-markdown-image";
import { getSafeAssistantHttpUrl } from "./assistant-url";

// Load Shiki only when a settled response contains a code block.
const ShikiHighlighter = lazy(() => import("react-shiki/web"));

const markdownRemarkPlugins = [remarkDirective, remarkAssistantDirectives, remarkGfm, remarkBreaks];

export const contextIcons = {
  app: IconApps,
  integration: IconLink,
  board: IconMessage,
  widget: IconTool,
  tool: IconTool,
  tools: IconTool,
};

export const ContextDirectiveChip = ({
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

export const hasModifiedLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) =>
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

export const AssistantDirectiveEntitiesContext = createContext<AssistantDirectiveEntitiesState>({
  entities: [],
  isLoading: false,
});

export const AssistantDirectiveEntitiesProvider = ({ children }: { children: ReactNode }) => {
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

export const AssistantTextPart = () => (
  <MarkdownTextPrimitive
    className={classes.messageMarkdown}
    preprocess={normalizeAssistantMarkdown}
    remarkPlugins={markdownRemarkPlugins}
    components={assistantMarkdownComponents}
    componentsByLanguage={{ mermaid: { SyntaxHighlighter: MermaidDiagram } }}
    defer
  />
);

export const UserTextPart = () => {
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

export const Attachment = ({ removable = false }: { removable?: boolean }) => {
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
export const SentAttachment = () => <Attachment />;
export const HiddenMessagePart = () => null;

export const ReasoningPart = (_props: ReasoningMessagePartProps) => (
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

export const AssistantMessagePending = ({ status }: EmptyMessagePartProps) => {
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

export const ReasoningVisibilityContext = createContext<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}>({ collapsed: false, setCollapsed: () => undefined });

export const SourcePart = (source: SourceMessagePartProps) => {
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

export const FilePart = ({ data, filename, mimeType }: FileMessagePartProps) => {
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

export const ImagePart = ({ image, filename }: ImageMessagePartProps) => {
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
