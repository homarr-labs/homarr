"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Loader,
  NavLink,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowUp,
  IconHistory,
  IconPlayerStopFilled,
  IconPlus,
  IconRobot,
  IconUser,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./chat.module.css";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function Chat({ options, integrationIds, isEditMode }: WidgetComponentProps<"openWebUi">) {
  const t = useI18n();
  const integrationId = integrationIds.at(0);

  const [model, setModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpened, setHistoryOpened] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingTextRef = useRef("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(72);

  const utils = clientApi.useUtils();

  const { data: models = [], isLoading: modelsLoading } = clientApi.widget.openWebUi.getModels.useQuery(
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
    { integrationId: integrationId ?? "", model: model ?? "", messages: pendingMessages },
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
  };

  const persistChat = async (finalMessages: ChatMessage[]) => {
    if (!integrationId || !model) return;
    const title = finalMessages.find((message) => message.role === "user")?.content.slice(0, 80) ?? "New chat";
    const payload = { title, models: [model], messages: finalMessages };
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

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !model || !integrationId || isStreaming) return;
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setInput("");

    const systemPrompt = options.systemPrompt.trim();
    const payloadMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...nextMessages]
      : nextMessages;

    streamingTextRef.current = "";
    setStreamingText("");
    setPendingMessages(payloadMessages);
    setIsStreaming(true);
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
    setHistoryOpened(false);
  };

  const modelData = useMemo(() => models.map((m) => ({ value: m.id, label: m.name ?? m.id })), [models]);

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
            <MessageBubble key={index} from={message.role} content={message.content} />
          ))}
          {isStreaming ? <MessageBubble from="assistant" content={streamingText || "…"} /> : null}
          {error ? (
            <Text size="xs" c="red.6">
              {error}
            </Text>
          ) : null}
        </Stack>
      </ScrollArea>

      <Paper ref={composerRef} className={classes.composer} withBorder radius="md" p="xs">
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
                  disabled={!input.trim() || !model}
                  aria-label={t("widget.openWebUi.send")}
                >
                  <IconArrowUp size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
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

function MessageBubble({ from, content }: { from: ChatMessage["role"]; content: string }) {
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
        <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {content}
        </Text>
      </Paper>
      {isUser ? avatar : null}
    </Group>
  );
}
