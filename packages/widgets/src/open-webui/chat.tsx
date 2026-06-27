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
  Modal,
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
  IconCamera,
  IconChevronDown,
  IconChevronRight,
  IconDatabase,
  IconFile,
  IconFileText,
  IconHistory,
  IconMessage,
  IconPaperclip,
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
interface FileAttachment {
  id: string;
  name: string;
}
interface NoteAttachment {
  id: string;
  title: string;
  content: string;
}
interface ChatAttachment {
  id: string;
  title: string;
  transcript: string;
}

// Which sub-view the attach popover is showing.
type AttachView = "root" | "webpage" | "files" | "notes" | "knowledge" | "chats";

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
  const [pendingContextTexts, setPendingContextTexts] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpened, setHistoryOpened] = useState(false);

  // Attachments. Images are inline per-message (vision); the rest are sticky
  // context kept for the conversation until removed.
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);
  const [webItems, setWebItems] = useState<WebAttachment[]>([]);
  const [fileItems, setFileItems] = useState<FileAttachment[]>([]);
  const [noteItems, setNoteItems] = useState<NoteAttachment[]>([]);
  const [chatItems, setChatItems] = useState<ChatAttachment[]>([]);
  const [webInput, setWebInput] = useState("");
  const [attachOpened, setAttachOpened] = useState(false);
  const [attachView, setAttachView] = useState<AttachView>("root");

  const [captureOpened, setCaptureOpened] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingTextRef = useRef("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const [composerHeight, setComposerHeight] = useState(72);

  const utils = clientApi.useUtils();

  const { data: models = [], isLoading: modelsLoading } = clientApi.widget.openWebUi.getModels.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const { data: knowledge = [] } = clientApi.widget.openWebUi.getKnowledge.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId) && attachOpened, refetchOnWindowFocus: false, retry: false },
  );

  const { data: files = [] } = clientApi.widget.openWebUi.getFiles.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId) && attachOpened, refetchOnWindowFocus: false, retry: false },
  );

  const { data: notes = [] } = clientApi.widget.openWebUi.getNotes.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId) && attachOpened, refetchOnWindowFocus: false, retry: false },
  );

  const { data: chats = [] } = clientApi.widget.openWebUi.getChats.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const { data: loadedChat } = clientApi.widget.openWebUi.getChat.useQuery(
    { integrationId: integrationId ?? "", chatId: selectedChatId ?? "" },
    { enabled: Boolean(integrationId) && Boolean(selectedChatId) },
  );

  const createChat = clientApi.widget.openWebUi.createChat.useMutation();
  const updateChat = clientApi.widget.openWebUi.updateChat.useMutation();
  const processWeb = clientApi.widget.openWebUi.processWeb.useMutation();
  const uploadFile = clientApi.widget.openWebUi.uploadFile.useMutation();

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

  // Reset the popover to the root view whenever it closes.
  useEffect(() => {
    if (!attachOpened) setAttachView("root");
  }, [attachOpened]);

  // Stop the camera stream on unmount.
  useEffect(() => () => stopCaptureStream(), []);

  clientApi.widget.openWebUi.sendMessage.useSubscription(
    {
      integrationId: integrationId ?? "",
      model: model ?? "",
      messages: pendingMessages,
      collections: pendingCollections.length > 0 ? pendingCollections : undefined,
      contextTexts: pendingContextTexts.length > 0 ? pendingContextTexts : undefined,
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
    setPendingContextTexts([]);
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
      await utils.widget.openWebUi.getChats.invalidate({ integrationId });
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

    // Retrieval collections: knowledge bases (id), web pages and files.
    const collections = [
      ...knowledgeIds,
      ...webItems.map((item) => item.collectionName),
      ...fileItems.map((item) => `file-${item.id}`),
    ];
    // Verbatim context: notes and referenced chats.
    const contextTexts = [
      ...noteItems.map((note) => `Note "${note.title}":\n${note.content}`),
      ...chatItems.map((chat) => `Previous chat "${chat.title}":\n${chat.transcript}`),
    ];

    streamingTextRef.current = "";
    setStreamingText("");
    setPendingMessages(toCompletionMessages(payloadMessages));
    setPendingCollections(collections);
    setPendingContextTexts(contextTexts);
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
    setPendingContextTexts([]);
    setAttachments([]);
    setKnowledgeIds([]);
    setWebItems([]);
    setFileItems([]);
    setNoteItems([]);
    setChatItems([]);
    setHistoryOpened(false);
  };

  // Upload Files: images become inline vision attachments; everything else is
  // uploaded to Open WebUI and grounded via retrieval.
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || !integrationId) return;
    for (const file of Array.from(fileList)) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (file.type.startsWith("image/")) {
          setAttachments((previous) => [...previous, { name: file.name, dataUrl }]);
        } else {
          const contentBase64 = dataUrl.split(",")[1] ?? "";
          const uploaded = await uploadFile.mutateAsync({
            integrationId,
            filename: file.name,
            contentBase64,
            contentType: file.type || "application/octet-stream",
          });
          setFileItems((previous) =>
            previous.some((item) => item.id === uploaded.id) ? previous : [...previous, uploaded],
          );
        }
      } catch {
        setError(t("widget.openWebUi.uploadError"));
      }
    }
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
      setAttachOpened(false);
    } catch {
      setError(t("widget.openWebUi.webError"));
    }
  };

  const toggleFile = (file: FileAttachment) =>
    setFileItems((previous) =>
      previous.some((item) => item.id === file.id)
        ? previous.filter((item) => item.id !== file.id)
        : [...previous, file],
    );

  const toggleNote = (note: NoteAttachment) =>
    setNoteItems((previous) =>
      previous.some((item) => item.id === note.id)
        ? previous.filter((item) => item.id !== note.id)
        : [...previous, note],
    );

  const toggleKnowledge = (id: string) =>
    setKnowledgeIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const toggleChatReference = async (chat: { id: string; title?: string | null }) => {
    if (!integrationId) return;
    if (chatItems.some((item) => item.id === chat.id)) {
      setChatItems((previous) => previous.filter((item) => item.id !== chat.id));
      return;
    }
    try {
      const full = await utils.widget.openWebUi.getChat.fetch({ integrationId, chatId: chat.id });
      const transcript = extractChatMessages(full.chat)
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");
      setChatItems((previous) => [...previous, { id: chat.id, title: chat.title ?? chat.id, transcript }]);
    } catch {
      setError(t("widget.openWebUi.chatError"));
    }
  };

  // ---- Camera capture ----
  const stopCaptureStream = () => {
    captureStreamRef.current?.getTracks().forEach((track) => track.stop());
    captureStreamRef.current = null;
  };

  const openCapture = async () => {
    setAttachOpened(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      captureStreamRef.current = stream;
      setCaptureOpened(true);
    } catch {
      setError(t("widget.openWebUi.captureError"));
    }
  };

  const closeCapture = () => {
    stopCaptureStream();
    setCaptureOpened(false);
  };

  useEffect(() => {
    if (captureOpened && videoRef.current && captureStreamRef.current) {
      videoRef.current.srcObject = captureStreamRef.current;
    }
  }, [captureOpened]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setAttachments((previous) => [
      ...previous,
      { name: `capture-${Date.now()}.png`, dataUrl: canvas.toDataURL("image/png") },
    ]);
    closeCapture();
  };

  // Drop the noisy ":latest" tag from the label (common for Ollama models); the
  // value keeps the full id so the right model is still sent.
  const modelData = useMemo(
    () => models.map((m) => ({ value: m.id, label: (m.name ?? m.id).replace(/:latest$/i, "") })),
    [models],
  );
  const hasAttachments =
    attachments.length > 0 ||
    knowledgeIds.length > 0 ||
    webItems.length > 0 ||
    fileItems.length > 0 ||
    noteItems.length > 0 ||
    chatItems.length > 0;

  // Whether the selected model can actually see attached images.
  const selectedModel = useMemo(() => models.find((item) => item.id === model), [models, model]);
  const modelSupportsVision = useMemo(() => {
    if (!selectedModel) return true;
    const capability = selectedModel.info?.meta?.capabilities?.vision;
    if (typeof capability === "boolean") return capability;
    return VISION_MODEL_PATTERN.test(selectedModel.id) || VISION_MODEL_PATTERN.test(selectedModel.name ?? "");
  }, [selectedModel]);
  const showVisionWarning = attachments.length > 0 && !modelSupportsVision;

  const attachViewTitle =
    attachView === "webpage"
      ? t("widget.openWebUi.attachWebpage")
      : attachView === "files"
        ? t("widget.openWebUi.attachFiles")
        : attachView === "notes"
          ? t("widget.openWebUi.attachNotes")
          : attachView === "knowledge"
            ? t("widget.openWebUi.attachKnowledge")
            : attachView === "chats"
              ? t("widget.openWebUi.referenceChats")
              : "";

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
              <AttachmentBadge
                key={id}
                color="grape"
                icon={<IconDatabase size={12} />}
                label={knowledge.find((item) => item.id === id)?.name ?? id}
                onRemove={() => toggleKnowledge(id)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {webItems.map((item) => (
              <AttachmentBadge
                key={item.collectionName}
                color="blue"
                icon={<IconWorld size={12} />}
                label={hostnameOf(item.url)}
                onRemove={() =>
                  setWebItems((previous) => previous.filter((value) => value.collectionName !== item.collectionName))
                }
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {fileItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="teal"
                icon={<IconFile size={12} />}
                label={item.name}
                onRemove={() => toggleFile(item)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {noteItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="yellow"
                icon={<IconFileText size={12} />}
                label={item.title}
                onRemove={() => toggleNote(item)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {chatItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="indigo"
                icon={<IconMessage size={12} />}
                label={item.title}
                onRemove={() => setChatItems((previous) => previous.filter((value) => value.id !== item.id))}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
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
              width={280}
              shadow="md"
            >
              <Popover.Target>
                <Tooltip label={t("widget.openWebUi.attach")} withinPortal={false}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    loading={processWeb.isPending || uploadFile.isPending}
                    onClick={() => setAttachOpened((value) => !value)}
                    aria-label={t("widget.openWebUi.attach")}
                  >
                    <IconPaperclip size={18} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown p={4}>
                {attachView === "root" ? (
                  <Stack gap={2}>
                    <MenuRow
                      icon={<IconPaperclip size={16} />}
                      label={t("widget.openWebUi.uploadFiles")}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <MenuRow
                      icon={<IconCamera size={16} />}
                      label={t("widget.openWebUi.capture")}
                      onClick={() => void openCapture()}
                    />
                    <MenuRow
                      icon={<IconWorld size={16} />}
                      label={t("widget.openWebUi.attachWebpage")}
                      hasSub
                      onClick={() => setAttachView("webpage")}
                    />
                    <MenuRow
                      icon={<IconFile size={16} />}
                      label={t("widget.openWebUi.attachFiles")}
                      hasSub
                      onClick={() => setAttachView("files")}
                    />
                    <MenuRow
                      icon={<IconFileText size={16} />}
                      label={t("widget.openWebUi.attachNotes")}
                      hasSub
                      onClick={() => setAttachView("notes")}
                    />
                    <MenuRow
                      icon={<IconDatabase size={16} />}
                      label={t("widget.openWebUi.attachKnowledge")}
                      hasSub
                      onClick={() => setAttachView("knowledge")}
                    />
                    <MenuRow
                      icon={<IconMessage size={16} />}
                      label={t("widget.openWebUi.referenceChats")}
                      hasSub
                      onClick={() => setAttachView("chats")}
                    />
                  </Stack>
                ) : (
                  <Stack gap={4}>
                    <Group gap={6} wrap="nowrap" px={4} pt={2}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => setAttachView("root")}
                        aria-label={t("widget.openWebUi.back")}
                      >
                        <IconArrowLeft size={16} />
                      </ActionIcon>
                      <Text fw={600} size="sm">
                        {attachViewTitle}
                      </Text>
                    </Group>

                    {attachView === "webpage" ? (
                      <Group gap={4} wrap="nowrap" p={4}>
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
                    ) : null}

                    {attachView === "files" ? (
                      <PickerList emptyLabel={t("widget.openWebUi.noFiles")} count={files.length}>
                        {files.map((file) => (
                          <Checkbox
                            key={file.id}
                            size="xs"
                            label={file.name}
                            checked={fileItems.some((item) => item.id === file.id)}
                            onChange={() => toggleFile(file)}
                          />
                        ))}
                      </PickerList>
                    ) : null}

                    {attachView === "notes" ? (
                      <PickerList emptyLabel={t("widget.openWebUi.noNotes")} count={notes.length}>
                        {notes.map((note) => (
                          <Checkbox
                            key={note.id}
                            size="xs"
                            label={note.title}
                            checked={noteItems.some((item) => item.id === note.id)}
                            onChange={() => toggleNote({ id: note.id, title: note.title, content: note.content })}
                          />
                        ))}
                      </PickerList>
                    ) : null}

                    {attachView === "knowledge" ? (
                      <PickerList emptyLabel={t("widget.openWebUi.noKnowledge")} count={knowledge.length}>
                        {knowledge.map((item) => (
                          <KnowledgeRow
                            key={item.id}
                            integrationId={integrationId ?? ""}
                            knowledgeId={item.id}
                            name={item.name ?? item.id}
                            selected={knowledgeIds.includes(item.id)}
                            onToggle={() => toggleKnowledge(item.id)}
                            isFileSelected={(id) => fileItems.some((file) => file.id === id)}
                            onToggleFile={toggleFile}
                          />
                        ))}
                      </PickerList>
                    ) : null}

                    {attachView === "chats" ? (
                      <PickerList emptyLabel={t("widget.openWebUi.noChats")} count={chats.length}>
                        {chats.map((chat) => (
                          <Checkbox
                            key={chat.id}
                            size="xs"
                            label={chat.title ?? chat.id}
                            checked={chatItems.some((item) => item.id === chat.id)}
                            onChange={() => void toggleChatReference(chat)}
                          />
                        ))}
                      </PickerList>
                    ) : null}
                  </Stack>
                )}
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
              maw={200}
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
          multiple
          hidden
          aria-label={t("widget.openWebUi.uploadFiles")}
          onChange={(event) => {
            void handleFilesSelected(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </Paper>

      <Modal opened={captureOpened} onClose={closeCapture} title={t("widget.openWebUi.capture")} centered>
        <Stack gap="sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            aria-label={t("widget.openWebUi.capture")}
            className={classes.captureVideo}
          >
            <track kind="captions" />
          </video>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={closeCapture}>
              {t("widget.openWebUi.back")}
            </Button>
            <Button size="xs" leftSection={<IconCamera size={16} />} onClick={takePhoto}>
              {t("widget.openWebUi.capture")}
            </Button>
          </Group>
        </Stack>
      </Modal>

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

function MenuRow({
  icon,
  label,
  hasSub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hasSub?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="subtle"
      color="gray"
      size="sm"
      fullWidth
      justify="space-between"
      leftSection={icon}
      rightSection={hasSub ? <IconChevronRight size={14} /> : <Box w={14} />}
      onClick={onClick}
      classNames={{ label: classes.menuRowLabel }}
    >
      {label}
    </Button>
  );
}

function PickerList({ count, emptyLabel, children }: { count: number; emptyLabel: string; children: React.ReactNode }) {
  if (count === 0) {
    return (
      <Text size="xs" c="dimmed" p="xs">
        {emptyLabel}
      </Text>
    );
  }
  return (
    <ScrollArea.Autosize mah={220} type="auto">
      <Stack gap={6} p={4}>
        {children}
      </Stack>
    </ScrollArea.Autosize>
  );
}

function KnowledgeRow({
  integrationId,
  knowledgeId,
  name,
  selected,
  onToggle,
  isFileSelected,
  onToggleFile,
}: {
  integrationId: string;
  knowledgeId: string;
  name: string;
  selected: boolean;
  onToggle: () => void;
  isFileSelected: (id: string) => boolean;
  onToggleFile: (file: FileAttachment) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: files = [], isLoading } = clientApi.widget.openWebUi.getKnowledgeFiles.useQuery(
    { integrationId, knowledgeId },
    { enabled: expanded && Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap" justify="space-between">
        <Checkbox size="xs" label={name} checked={selected} onChange={onToggle} />
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </ActionIcon>
      </Group>
      {expanded ? (
        <Stack gap={4} pl="md">
          {isLoading ? (
            <Loader size="xs" />
          ) : (
            files.map((file) => (
              <Checkbox
                key={file.id}
                size="xs"
                label={file.name}
                checked={isFileSelected(file.id)}
                onChange={() => onToggleFile(file)}
              />
            ))
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}

function AttachmentBadge({
  color,
  icon,
  label,
  onRemove,
  removeLabel,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <Badge
      variant="light"
      color={color}
      leftSection={icon}
      rightSection={<CloseButton size="xs" onClick={onRemove} aria-label={removeLabel} />}
      className={classes.attachmentBadge}
    >
      {label}
    </Badge>
  );
}

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
