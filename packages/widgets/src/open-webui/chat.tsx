"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  CloseButton,
  Group,
  Image,
  Loader,
  Modal,
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
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowUp,
  IconCamera,
  IconCheck,
  IconDatabase,
  IconFile,
  IconFileText,
  IconHistory,
  IconMessage,
  IconMicrophone,
  IconPlayerStopFilled,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconWorld,
  IconX,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { AttachmentBadge, AttachPopover, MessageBubble, RecordingWaveform } from "./chat-components";
import classes from "./chat.module.css";
import { VISION_MODEL_PATTERN, formatSeconds, hostnameOf } from "./chat-utils";
import { useAttachments } from "./use-attachments";
import { useCameraCapture } from "./use-camera-capture";
import { useChatStream } from "./use-chat-stream";
import { useVoiceRecording } from "./use-voice-recording";

export function Chat({ options, integrationIds, isEditMode }: WidgetComponentProps<"openWebUi">) {
  const t = useI18n();
  const integrationId = integrationIds.at(0);

  const [model, setModel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyOpened, setHistoryOpened] = useState(false);
  const [composerHeight, setComposerHeight] = useState(72);

  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models = [], isLoading: modelsLoading } = clientApi.widget.openWebUi.getModels.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const { data: chats = [] } = clientApi.widget.openWebUi.getChats.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  const attachments = useAttachments({
    integrationId,
    onError: setError,
    errorMessages: {
      upload: t("widget.openWebUi.uploadError"),
      web: t("widget.openWebUi.webError"),
      note: t("widget.openWebUi.noteError"),
      chat: t("widget.openWebUi.chatError"),
    },
  });

  const closeHistory = useCallback(() => setHistoryOpened(false), []);
  const stream = useChatStream({
    integrationId,
    model,
    setModel,
    systemPrompt: options.systemPrompt,
    buildGrounding: attachments.buildGrounding,
    setError,
    onChatLoaded: closeHistory,
    newChatTitle: t("widget.openWebUi.newChat"),
  });

  const voice = useVoiceRecording({
    integrationId,
    onError: setError,
    onTranscribed: (text) => setInput((previous) => (previous ? `${previous} ${text}` : text)),
    micErrorMessage: t("widget.openWebUi.micError"),
    transcribeErrorMessage: t("widget.openWebUi.transcribeError"),
  });

  const camera = useCameraCapture({
    onError: setError,
    onCapture: (attachment) => attachments.setImages((previous) => [...previous, attachment]),
    captureErrorMessage: t("widget.openWebUi.captureError"),
  });

  // Default to the first available model once the list loads.
  useEffect(() => {
    if (model !== null || models.length === 0) return;
    setModel(models[0]?.id ?? null);
  }, [model, models]);

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
  }, [stream.messages, stream.streamingText, composerHeight]);

  // Nothing to send yet: no typed text and no inline image attachments.
  const composerEmpty = !input.trim() && attachments.images.length === 0;

  const handleSend = () => {
    const trimmed = input.trim();
    if (composerEmpty || !model || !integrationId || stream.isStreaming) return;

    stream.send({
      role: "user",
      content: trimmed,
      images: attachments.images.length > 0 ? attachments.images.map((item) => item.dataUrl) : undefined,
    });
    setInput("");
    attachments.setImages([]);
  };

  const handleNewChat = () => {
    stream.reset();
    attachments.reset();
    setError(null);
    setHistoryOpened(false);
  };

  // Drop the noisy ":latest" tag from the label (common for Ollama models); the
  // value keeps the full id so the right model is still sent.
  const modelData = useMemo(
    () => models.map((m) => ({ value: m.id, label: (m.name ?? m.id).replace(/:latest$/i, "") })),
    [models],
  );

  // Whether the selected model can actually see attached images.
  const selectedModel = useMemo(() => models.find((item) => item.id === model), [models, model]);
  const modelSupportsVision = useMemo(() => {
    if (!selectedModel) return true;
    const capability = selectedModel.info?.meta?.capabilities?.vision;
    if (typeof capability === "boolean") return capability;
    return VISION_MODEL_PATTERN.test(selectedModel.id) || VISION_MODEL_PATTERN.test(selectedModel.name ?? "");
  }, [selectedModel]);
  const showVisionWarning = attachments.images.length > 0 && !modelSupportsVision;

  return (
    <Box className={classes.root} style={isEditMode ? { pointerEvents: "none" } : undefined}>
      <ScrollArea className={classes.messages} viewportRef={viewportRef} type="auto">
        <Stack gap="xs" p="xs" pb={composerHeight + 24}>
          {stream.messages.length === 0 && !stream.isStreaming ? (
            <Stack align="center" justify="center" gap="xs" mt="xl" c="dimmed">
              <IconRobot size={32} />
              <Text size="sm">{t("widget.openWebUi.emptyState")}</Text>
            </Stack>
          ) : null}
          {stream.messages.map((message, index) => (
            <MessageBubble key={index} from={message.role} content={message.content} images={message.images} />
          ))}
          {stream.isStreaming ? (
            <MessageBubble from="assistant" content={stream.streamingText} loading={!stream.streamingText} />
          ) : null}
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
                onClick={stream.retry}
              >
                {t("widget.openWebUi.retry")}
              </Button>
            </Group>
          ) : null}
        </Stack>
      </ScrollArea>

      <Paper ref={composerRef} className={classes.composer} withBorder radius="md" p="xs">
        {attachments.hasAttachments ? (
          <Group gap={6} mb={6}>
            {attachments.images.map((attachment, index) => (
              <Box key={`${attachment.name}-${index}`} className={classes.thumb}>
                <Image src={attachment.dataUrl} alt={attachment.name} w={48} h={48} radius="sm" fit="cover" />
                <CloseButton
                  size="xs"
                  className={classes.thumbRemove}
                  onClick={() => attachments.setImages((previous) => previous.filter((_, i) => i !== index))}
                  aria-label={t("widget.openWebUi.removeAttachment")}
                />
              </Box>
            ))}
            {attachments.knowledgeIds.map((id) => (
              <AttachmentBadge
                key={id}
                color="grape"
                icon={<IconDatabase size={12} />}
                label={attachments.knowledge.find((item) => item.id === id)?.name ?? id}
                onRemove={() => attachments.toggleKnowledge(id)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {attachments.webItems.map((item) => (
              <AttachmentBadge
                key={item.collectionName}
                color="blue"
                icon={<IconWorld size={12} />}
                label={hostnameOf(item.url)}
                onRemove={() =>
                  attachments.setWebItems((previous) =>
                    previous.filter((value) => value.collectionName !== item.collectionName),
                  )
                }
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {attachments.fileItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="teal"
                icon={<IconFile size={12} />}
                label={item.name}
                onRemove={() => attachments.toggleFile(item)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {attachments.noteItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="yellow"
                icon={<IconFileText size={12} />}
                label={item.title}
                onRemove={() => void attachments.toggleNote(item)}
                removeLabel={t("widget.openWebUi.removeAttachment")}
              />
            ))}
            {attachments.chatItems.map((item) => (
              <AttachmentBadge
                key={item.id}
                color="indigo"
                icon={<IconMessage size={12} />}
                label={item.title}
                onRemove={() =>
                  attachments.setChatItems((previous) => previous.filter((value) => value.id !== item.id))
                }
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

        {voice.isRecording ? (
          <Group gap="xs" wrap="nowrap" className={classes.recordingBar} mt={4}>
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              onClick={voice.cancelRecording}
              aria-label={t("widget.openWebUi.cancelRecording")}
            >
              <IconX size={18} />
            </ActionIcon>
            <Box className={classes.waveformWrap}>
              <RecordingWaveform analyser={voice.analyser} />
            </Box>
            <Text size="xs" c="dimmed" className={classes.recordingTime}>
              {formatSeconds(voice.recordingSeconds)}
            </Text>
            <ActionIcon
              variant="filled"
              radius="xl"
              loading={voice.isTranscribing}
              onClick={voice.confirmRecording}
              aria-label={t("widget.openWebUi.stopRecording")}
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Group>
        ) : (
          <>
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
                <AttachPopover
                  attachments={attachments}
                  chats={chats}
                  integrationId={integrationId}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onCapture={() => {
                    attachments.openAttach(false);
                    void camera.openCapture();
                  }}
                />
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
                  disabled={stream.isStreaming}
                  placeholder={t("widget.openWebUi.selectModel")}
                  nothingFoundMessage={t("widget.openWebUi.noModels")}
                  rightSection={modelsLoading ? <Loader size="xs" /> : undefined}
                  comboboxProps={{ withinPortal: false }}
                  maw={200}
                  className={classes.modelSelect}
                />
                {!stream.isStreaming && composerEmpty ? (
                  <Tooltip label={t("widget.openWebUi.record")} withinPortal={false}>
                    <ActionIcon
                      radius="xl"
                      variant="subtle"
                      color="gray"
                      loading={voice.isTranscribing}
                      onClick={() => {
                        setError(null);
                        void voice.startRecording();
                      }}
                      aria-label={t("widget.openWebUi.record")}
                    >
                      <IconMicrophone size={18} />
                    </ActionIcon>
                  </Tooltip>
                ) : null}
                {stream.isStreaming ? (
                  <Tooltip label={t("widget.openWebUi.stop")} withinPortal={false}>
                    <ActionIcon
                      radius="xl"
                      color="red"
                      variant="filled"
                      onClick={stream.stop}
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
                      disabled={composerEmpty || !model}
                      aria-label={t("widget.openWebUi.send")}
                    >
                      <IconArrowUp size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-label={t("widget.openWebUi.uploadFiles")}
          onChange={(event) => {
            void attachments.handleFilesSelected(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </Paper>

      <Modal opened={camera.captureOpened} onClose={camera.closeCapture} title={t("widget.openWebUi.capture")} centered>
        <Stack gap="sm">
          <video
            ref={camera.setVideoNode}
            autoPlay
            playsInline
            muted
            aria-label={t("widget.openWebUi.capture")}
            className={classes.captureVideo}
          >
            <track kind="captions" />
          </video>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={camera.closeCapture}>
              {t("widget.openWebUi.back")}
            </Button>
            <Button size="xs" leftSection={<IconCamera size={16} />} onClick={camera.takePhoto}>
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
                    active={chat.id === stream.activeChatId}
                    label={chat.title ?? chat.id}
                    onClick={() => stream.setSelectedChatId(chat.id)}
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
