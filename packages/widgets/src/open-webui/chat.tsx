"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Group,
  Image,
  Loader,
  NavLink,
  Paper,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowUp,
  IconDatabase,
  IconHistory,
  IconPaperclip,
  IconPhoto,
  IconPlayerStopFilled,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./chat.module.css";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

type CompletionPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type CompletionMessage = { role: ChatMessage["role"]; content: string | CompletionPart[] };

interface ImageAttachment {
  name: string;
  dataUrl: string;
}

interface WebAttachment {
  url: string;
  collectionName: string;
  title: string;
}

// Heuristic fallback for detecting vision-capable models when Open WebUI does
// not declare the capability explicitly.
const VISION_MODEL_PATTERN =
  /vision|llava|bakllava|moondream|minicpm-?v|qwen2?-?vl|pixtral|cogvlm|internvl|gemma3|smolvlm|granite[\w-]*vision/i;

export function Chat({ options, integrationIds, isEditMode }: WidgetComponentProps<"openWebUi">) {
  const t = useI18n();
  const integrationId = integrationIds.at(0);

  const [model, setModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<CompletionMessage[]>([]);
  const [pendingCollections, setPendingCollections] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpened, setHistoryOpened] = useState(false);

  // Attachments grounding the conversation. Images are per-message; knowledge
  // collections and web pages are sticky context kept until removed.
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);
  const [webItems, setWebItems] = useState<WebAttachment[]>([]);
  const [webInput, setWebInput] = useState("");
  const [attachOpened, setAttachOpened] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingTextRef = useRef("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [composerHeight, setComposerHeight] = useState(72);

  const utils = clientApi.useUtils();

  const { data: models = [], isLoading: modelsLoading } = clientApi.widget.openWebUi.getModels.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const { data: knowledge = [] } = clientApi.widget.openWebUi.getKnowledge.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const { data: chats = [] } = clientApi.widget.openWebUi.getChats.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId) && options.showHistory, refetchOnWindowFocus: false, retry: false },
  );

  const { data: loadedChat } = clientApi.widget.openWebUi.getChat.useQuery(
    { integrationId: integrationId ?? "", chatId: selectedChatId ?? "" },
    { enabled: Boolean(integrationId) && Boolean(selectedChatId) },
  );

  const createChat = clientApi.widget.openWebUi.createChat.useMutation();
  const updateChat = clientApi.widget.openWebUi.updateChat.useMutation();
  const processWeb = clientApi.widget.openWebUi.processWeb.useMutation();

  // Default to the first available model once the list loads.
  useEffect(() => {
    if (model !== null || models.length === 0) return;
    setModel(models[0]?.id ?? null);
  }, [model, models]);

  // Hydrate the conversation when a history chat finishes loading.
  useEffect(() => {
    if (!loadedChat) return;
    const loadedMessages = extractChatMessages(loadedChat.chat);
    setMessages(loadedMessages);
    messagesRef.current = loadedMessages;
    setActiveChatId(loadedChat.id);
    if (loadedChat.chat?.models?.[0]) {
      setModel(loadedChat.chat.models[0]);
    }
    setHistoryOpened(false);
  }, [loadedChat]);

  // Track the floating composer's height so messages can pad below it.
  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setComposerHeight(element.offsetHeight));
    observer.observe(element);
    setComposerHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to the bottom as messages or streamed tokens arrive.
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText, composerHeight]);

  clientApi.widget.openWebUi.sendMessage.useSubscription(
    {
      integrationId: integrationId ?? "",
      model: model ?? "",
      messages: pendingMessages,
      collections: pendingCollections.length > 0 ? pendingCollections : undefined,
    },
    {
      enabled: isStreaming && pendingMessages.length > 0,
      onData: (event) => {
        if (event.type === "delta") {
          streamingTextRef.current += event.content;
          setStreamingText(streamingTextRef.current);
        } else if (event.type === "done") {
          finalizeAssistantMessage();
        } else if (event.type === "error") {
          setError(event.message);
          finalizeAssistantMessage();
        }
      },
      onError: (err) => {
        setError(err.message);
        finalizeAssistantMessage();
      },
    },
  );

  const finalizeAssistantMessage = () => {
    const finalText = streamingTextRef.current;
    if (finalText.length > 0) {
      const finalMessages = [...messagesRef.current, { role: "assistant" as const, content: finalText }];
      setMessages(finalMessages);
      messagesRef.current = finalMessages;
      void persistChat(finalMessages);
    }
    streamingTextRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    setPendingMessages([]);
    setPendingCollections([]);
  };

  const persistChat = async (finalMessages: ChatMessage[]) => {
    if (!integrationId || !model) return;
    // Native history stores plain text; image data URLs are dropped on persist.
    const title = finalMessages.find((message) => message.role === "user")?.content.slice(0, 80) ?? "New chat";
    const payload = {
      title,
      models: [model],
      messages: finalMessages.map(({ role, content }) => ({ role, content })),
    };
    try {
      if (activeChatId) {
        await updateChat.mutateAsync({ integrationId, chatId: activeChatId, chat: payload });
      } else {
        const chat = await createChat.mutateAsync({ integrationId, ...payload });
        setActiveChatId(chat.id);
      }
      if (options.showHistory) {
        await utils.widget.openWebUi.getChats.invalidate({ integrationId });
      }
    } catch {
      // Persistence is best-effort; the conversation remains usable in-memory.
    }
  };

  // Kick off a completion for the given conversation (ending with a user message).
  // Shared by sending a new message and retrying after a failure.
  const startCompletion = (baseMessages: ChatMessage[]) => {
    if (!model || !integrationId) return;
    setError(null);

    const systemPrompt = options.systemPrompt.trim();
    const payloadMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...baseMessages]
      : baseMessages;

    // Knowledge ids double as their collection name; web pages bring their own.
    const collections = [...knowledgeIds, ...webItems.map((item) => item.collectionName)];

    streamingTextRef.current = "";
    setStreamingText("");
    setPendingMessages(toCompletionMessages(payloadMessages));
    setPendingCollections(collections);
    setIsStreaming(true);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || !model || !integrationId || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      images: attachments.length > 0 ? attachments.map((attachment) => attachment.dataUrl) : undefined,
    };
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setInput("");
    setAttachments([]);

    startCompletion(nextMessages);
  };

  // Retry the last turn after a failure: drop any partial assistant reply and
  // re-run the completion from the most recent user message.
  const handleRetry = () => {
    if (isStreaming) return;
    const lastUserIndex = messagesRef.current.findLastIndex((message) => message.role === "user");
    if (lastUserIndex === -1) return;

    const truncated = messagesRef.current.slice(0, lastUserIndex + 1);
    setMessages(truncated);
    messagesRef.current = truncated;
    startCompletion(truncated);
  };

  const handleNewChat = () => {
    setMessages([]);
    messagesRef.current = [];
    setActiveChatId(null);
    setSelectedChatId(null);
    setError(null);
    streamingTextRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    setPendingMessages([]);
    setPendingCollections([]);
    setAttachments([]);
    setKnowledgeIds([]);
    setWebItems([]);
    setHistoryOpened(false);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList) return;
    const images = await Promise.all(
      Array.from(fileList)
        .filter((file) => file.type.startsWith("image/"))
        .map(async (file) => ({ name: file.name, dataUrl: await readFileAsDataUrl(file) })),
    );
    setAttachments((previous) => [...previous, ...images]);
  };

  const addWebUrl = async () => {
    if (!integrationId) return;
    const raw = webInput.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setWebInput("");
    setError(null);
    try {
      const document = await processWeb.mutateAsync({ integrationId, url });
      setWebItems((previous) =>
        previous.some((item) => item.collectionName === document.collectionName)
          ? previous
          : [...previous, { url, collectionName: document.collectionName, title: document.title }],
      );
    } catch {
      setError(t("widget.openWebUi.webError"));
    }
  };

  const modelData = useMemo(() => models.map((m) => ({ value: m.id, label: m.name ?? m.id })), [models]);
  const knowledgeName = (id: string) => knowledge.find((item) => item.id === id)?.name ?? id;
  const hasAttachments = attachments.length > 0 || knowledgeIds.length > 0 || webItems.length > 0;

  // Whether the selected model can actually see attached images. Prefer Open
  // WebUI's declared capability; fall back to a name heuristic when it's absent.
  const selectedModel = useMemo(() => models.find((item) => item.id === model), [models, model]);
  const modelSupportsVision = useMemo(() => {
    if (!selectedModel) return true;
    const capability = selectedModel.info?.meta?.capabilities?.vision;
    if (typeof capability === "boolean") return capability;
    return VISION_MODEL_PATTERN.test(selectedModel.id) || VISION_MODEL_PATTERN.test(selectedModel.name ?? "");
  }, [selectedModel]);
  const showVisionWarning = attachments.length > 0 && !modelSupportsVision;

  return (
    <Box className={classes.root} style={isEditMode ? { pointerEvents: "none" } : undefined}>
      <ScrollArea className={classes.messages} viewportRef={viewportRef} type="auto">
        <Stack gap="xs" p="xs" pb={composerHeight + 24}>
          {messages.length === 0 && !isStreaming ? (
            <Stack align="center" justify="center" gap="xs" mt="xl" c="dimmed">
              <IconRobot size={32} />
              <Text size="sm">{t("widget.openWebUi.emptyState")}</Text>
            </Stack>
          ) : null}
          {messages.map((message, index) => (
            <MessageBubble key={index} from={message.role} content={message.content} images={message.images} />
          ))}
          {isStreaming ? <MessageBubble from="assistant" content={streamingText || "…"} /> : null}
          {error ? (
            <Group gap="xs" justify="center" wrap="nowrap">
              <Text size="xs" c="red.6">
                {error}
              </Text>
              <Button
                size="compact-xs"
                variant="light"
                color="red"
                leftSection={<IconRefresh size={14} />}
                onClick={handleRetry}
              >
                {t("widget.openWebUi.retry")}
              </Button>
            </Group>
          ) : null}
        </Stack>
      </ScrollArea>

      <Paper ref={composerRef} className={classes.composer} withBorder radius="md" p="xs">
        {hasAttachments ? (
          <Group gap={6} mb={6}>
            {attachments.map((attachment, index) => (
              <Box key={`${attachment.name}-${index}`} className={classes.thumb}>
                <Image src={attachment.dataUrl} alt={attachment.name} w={48} h={48} radius="sm" fit="cover" />
                <CloseButton
                  size="xs"
                  className={classes.thumbRemove}
                  onClick={() => setAttachments((previous) => previous.filter((_, i) => i !== index))}
                  aria-label={t("widget.openWebUi.removeAttachment")}
                />
              </Box>
            ))}
            {knowledgeIds.map((id) => (
              <Badge
                key={id}
                variant="light"
                color="grape"
                leftSection={<IconDatabase size={12} />}
                rightSection={
                  <CloseButton
                    size="xs"
                    onClick={() => setKnowledgeIds((previous) => previous.filter((value) => value !== id))}
                    aria-label={t("widget.openWebUi.removeAttachment")}
                  />
                }
              >
                {knowledgeName(id)}
              </Badge>
            ))}
            {webItems.map((item) => (
              <Badge
                key={item.collectionName}
                variant="light"
                color="blue"
                leftSection={<IconWorld size={12} />}
                rightSection={
                  <CloseButton
                    size="xs"
                    onClick={() =>
                      setWebItems((previous) =>
                        previous.filter((value) => value.collectionName !== item.collectionName),
                      )
                    }
                    aria-label={t("widget.openWebUi.removeAttachment")}
                  />
                }
              >
                {hostnameOf(item.url)}
              </Badge>
            ))}
          </Group>
        ) : null}

        {showVisionWarning ? (
          <Group gap={4} mb={6} wrap="nowrap">
            <IconAlertTriangle size={14} color="var(--mantine-color-yellow-6)" />
            <Text size="xs" c="yellow.7">
              {t("widget.openWebUi.visionWarning")}
            </Text>
          </Group>
        ) : null}

        <Textarea
          variant="unstyled"
          size="sm"
          autosize
          minRows={1}
          maxRows={5}
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder={t("widget.openWebUi.messagePlaceholder")}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <Group justify="space-between" gap="xs" wrap="nowrap" mt={4}>
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t("widget.openWebUi.newChat")} withinPortal={false}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={handleNewChat}
                aria-label={t("widget.openWebUi.newChat")}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
            <Popover
              opened={attachOpened}
              onChange={setAttachOpened}
              position="top-start"
              withinPortal={false}
              width={260}
              shadow="md"
            >
              <Popover.Target>
                <Tooltip label={t("widget.openWebUi.attach")} withinPortal={false}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setAttachOpened((value) => !value)}
                    aria-label={t("widget.openWebUi.attach")}
                  >
                    <IconPaperclip size={18} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Button
                    variant="light"
                    color="gray"
                    size="xs"
                    leftSection={<IconPhoto size={16} />}
                    justify="flex-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("widget.openWebUi.attachImage")}
                  </Button>

                  {knowledge.length > 0 ? (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="dimmed">
                        {t("widget.openWebUi.attachKnowledge")}
                      </Text>
                      <Checkbox.Group value={knowledgeIds} onChange={setKnowledgeIds}>
                        <Stack gap={4}>
                          {knowledge.map((item) => (
                            <Checkbox key={item.id} value={item.id} label={item.name ?? item.id} size="xs" />
                          ))}
                        </Stack>
                      </Checkbox.Group>
                    </Stack>
                  ) : null}

                  <Stack gap={4}>
                    <Text size="xs" fw={600} c="dimmed">
                      {t("widget.openWebUi.attachWebpage")}
                    </Text>
                    <Group gap={4} wrap="nowrap">
                      <TextInput
                        size="xs"
                        flex={1}
                        placeholder="https://…"
                        value={webInput}
                        onChange={(event) => setWebInput(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void addWebUrl();
                          }
                        }}
                      />
                      <ActionIcon
                        variant="light"
                        color="gray"
                        loading={processWeb.isPending}
                        onClick={() => void addWebUrl()}
                        aria-label={t("widget.openWebUi.addUrl")}
                      >
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            {options.showHistory ? (
              <Tooltip label={t("widget.openWebUi.history")} withinPortal={false}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setHistoryOpened(true)}
                  aria-label={t("widget.openWebUi.history")}
                >
                  <IconHistory size={18} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Select
              variant="unstyled"
              size="sm"
              searchable
              data={modelData}
              value={model}
              onChange={setModel}
              placeholder={t("widget.openWebUi.selectModel")}
              nothingFoundMessage={t("widget.openWebUi.noModels")}
              rightSection={modelsLoading ? <Loader size="xs" /> : undefined}
              comboboxProps={{ withinPortal: false }}
              maw={160}
              className={classes.modelSelect}
            />
            {isStreaming ? (
              <Tooltip label={t("widget.openWebUi.stop")} withinPortal={false}>
                <ActionIcon
                  radius="xl"
                  color="red"
                  variant="filled"
                  onClick={finalizeAssistantMessage}
                  aria-label={t("widget.openWebUi.stop")}
                >
                  <IconPlayerStopFilled size={16} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <Tooltip label={t("widget.openWebUi.send")} withinPortal={false}>
                <ActionIcon
                  radius="xl"
                  variant="filled"
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || !model}
                  aria-label={t("widget.openWebUi.send")}
                >
                  <IconArrowUp size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label={t("widget.openWebUi.attachImage")}
          onChange={(event) => {
            void handleFilesSelected(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </Paper>

      {options.showHistory && historyOpened ? (
        <Paper className={classes.historyOverlay} radius={0}>
          <Group gap="xs" p="xs" wrap="nowrap" className={classes.historyHeader}>
            <Tooltip label={t("widget.openWebUi.back")} withinPortal={false}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setHistoryOpened(false)}
                aria-label={t("widget.openWebUi.back")}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>
            <Text fw={600} size="sm">
              {t("widget.openWebUi.history")}
            </Text>
          </Group>
          <ScrollArea className={classes.historyList} type="auto">
            <Stack gap={2} p={4}>
              {chats.length === 0 ? (
                <Text size="sm" c="dimmed" p="xs">
                  {t("widget.openWebUi.emptyState")}
                </Text>
              ) : (
                chats.map((chat) => (
                  <NavLink
                    key={chat.id}
                    active={chat.id === activeChatId}
                    label={chat.title ?? chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                  />
                ))
              )}
            </Stack>
          </ScrollArea>
        </Paper>
      ) : null}
    </Box>
  );
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read file")));
    reader.readAsDataURL(file);
  });

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
};

// Convert displayed messages to the OpenAI completion format, inlining any
// attached images on the message that carries them (vision content parts).
const toCompletionMessages = (messages: ChatMessage[]): CompletionMessage[] =>
  messages.map((message) =>
    message.images && message.images.length > 0
      ? {
          role: message.role,
          content: [
            ...(message.content ? [{ type: "text" as const, text: message.content }] : []),
            ...message.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ],
        }
      : { role: message.role, content: message.content },
  );

type RawMessage = { role?: string | null; content?: string | null };
type HistoryMessage = RawMessage & { parentId?: string | null };
interface RawChat {
  messages?: RawMessage[] | null;
  history?: { currentId?: string | null; messages?: Record<string, HistoryMessage> | null } | null;
}

const toChatMessage = (role: string | null | undefined, content: string | null | undefined): ChatMessage | null =>
  (role === "system" || role === "user" || role === "assistant") && typeof content === "string"
    ? { role, content }
    : null;

/**
 * Reconstructs the ordered conversation from an Open WebUI chat. Chats created in
 * the Open WebUI UI store the active branch as a tree under `chat.history`
 * (walk from `currentId` up through `parentId`); `chat.messages` can be stale, so
 * the history tree takes precedence and we fall back to the flat list.
 */
const extractChatMessages = (chat: RawChat | null | undefined): ChatMessage[] => {
  const history = chat?.history;
  if (history?.messages && history.currentId) {
    const map = history.messages;
    const ordered: ChatMessage[] = [];
    const seen = new Set<string>();
    let cursor: string | null | undefined = history.currentId;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node: HistoryMessage | undefined = map[cursor];
      if (!node) break;
      const message = toChatMessage(node.role, node.content);
      if (message) ordered.unshift(message);
      cursor = node.parentId;
    }
    if (ordered.length > 0) return ordered;
  }
  return (chat?.messages ?? [])
    .map((message) => toChatMessage(message.role, message.content))
    .filter((message): message is ChatMessage => message !== null);
};

function MessageBubble({ from, content, images }: { from: ChatMessage["role"]; content: string; images?: string[] }) {
  const isUser = from === "user";
  const avatar = (
    <Avatar size={22} radius="xl" variant="filled" color={isUser ? "gray" : "blue"} className={classes.avatar}>
      {isUser ? <IconUser size={14} /> : <IconRobot size={14} />}
    </Avatar>
  );
  return (
    <Group gap={6} align="flex-start" wrap="nowrap" justify={isUser ? "flex-end" : "flex-start"}>
      {isUser ? null : avatar}
      <Paper
        className={classes.bubble}
        withBorder={false}
        bg={isUser ? "var(--mantine-primary-color-light)" : "var(--mantine-color-default-hover)"}
        p="xs"
        radius="md"
      >
        {images && images.length > 0 ? (
          <Group gap={4} mb={content ? 6 : 0}>
            {images.map((src, index) => (
              <Image key={index} src={src} alt="" w={120} radius="sm" fit="contain" />
            ))}
          </Group>
        ) : null}
        {content ? (
          <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {content}
          </Text>
        ) : null}
      </Paper>
      {isUser ? avatar : null}
    </Group>
  );
}
