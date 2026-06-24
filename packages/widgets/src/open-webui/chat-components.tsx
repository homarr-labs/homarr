import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Combobox,
  Group,
  Image,
  Input,
  InputBase,
  Loader,
  Paper,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCamera,
  IconCaretDownFilled,
  IconCaretUpFilled,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDatabase,
  IconFile,
  IconFileText,
  IconMessage,
  IconPaperclip,
  IconPlus,
  IconRobot,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";

import { clientApi } from "@homarr/api/client";
import { getIconUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { AttachView, ChatMessage, FileAttachment } from "./chat-types";
import type { useAttachments } from "./use-attachments";
import classes from "./chat.module.css";

// Model picker: a non-editable button target showing the selected model, with a
// search field inside the dropdown to filter the list on the frontend.
export function ModelSelect({
  data,
  value,
  onChange,
  loading,
  disabled,
}: {
  data: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const t = useI18n();
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => combobox.focusSearchInput(),
  });

  const selectedLabel = data.find((item) => item.value === value)?.label;
  const filtered = data.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(submitted) => {
        onChange(submitted);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          variant="unstyled"
          size="sm"
          disabled={disabled}
          w={200}
          classNames={{ input: classes.modelSelectControl }}
          rightSection={
            loading ? (
              <Loader size="xs" />
            ) : combobox.dropdownOpened ? (
              <IconCaretUpFilled size={14} />
            ) : (
              <IconCaretDownFilled size={14} />
            )
          }
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
        >
          {selectedLabel ? (
            <span className={classes.modelSelectLabel}>{selectedLabel}</span>
          ) : (
            <Input.Placeholder>{t("widget.openWebUi.selectModel")}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={t("widget.openWebUi.searchModel")}
        />
        <Combobox.Options mah={220} style={{ overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <Combobox.Option value={item.value} key={item.value} active={item.value === value}>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                  <span className={classes.modelOptionLabel}>{item.label}</span>
                  {item.value === value ? <IconCheck size={14} /> : null}
                </Group>
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>{t("widget.openWebUi.noModels")}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export function MenuRow({
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

export function PickerList({
  count,
  emptyLabel,
  children,
}: {
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
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

export function KnowledgeRow({
  integrationId,
  knowledgeId,
  name,
  selected,
  onToggle,
  isFileSelected,
  onToggleFile,
  emptyFilesLabel,
}: {
  integrationId: string;
  knowledgeId: string;
  name: string;
  selected: boolean;
  onToggle: () => void;
  isFileSelected: (id: string) => boolean;
  onToggleFile: (file: FileAttachment) => void;
  emptyFilesLabel: string;
}) {
  // Default to expanded so a base's documents are visible without an extra click.
  const [expanded, setExpanded] = useState(true);
  const { data: files = [], isLoading } = clientApi.widget.openWebUi.getKnowledgeFiles.useQuery(
    { integrationId, knowledgeId },
    { enabled: expanded && Boolean(integrationId), refetchOnWindowFocus: false, retry: false },
  );

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap" justify="space-between">
        <Checkbox size="xs" label={name} checked={selected} onChange={onToggle} />
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          aria-label={name}
        >
          {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </ActionIcon>
      </Group>
      {expanded ? (
        <Stack gap={4} pl="md">
          {isLoading ? (
            <Loader size="xs" />
          ) : files.length === 0 ? (
            <Text size="xs" c="dimmed">
              {emptyFilesLabel}
            </Text>
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

export function AttachmentBadge({
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

// The "attach" popover: a root menu of sources and the per-source sub-views
// (web URL input, file / note / knowledge / chat pickers) used to ground a reply.
export function AttachPopover({
  attachments,
  chats,
  integrationId,
  onUploadClick,
  onCapture,
}: {
  attachments: ReturnType<typeof useAttachments>;
  chats: { id: string; title?: string | null }[];
  integrationId: string | undefined;
  onUploadClick: () => void;
  onCapture: () => void;
}) {
  const t = useI18n();

  const attachViewTitles: Record<Exclude<AttachView, "root">, string> = {
    webpage: t("widget.openWebUi.attachWebpage"),
    files: t("widget.openWebUi.attachFiles"),
    notes: t("widget.openWebUi.attachNotes"),
    knowledge: t("widget.openWebUi.attachKnowledge"),
    chats: t("widget.openWebUi.referenceChats"),
  };
  const attachViewTitle = attachments.attachView === "root" ? "" : attachViewTitles[attachments.attachView];

  return (
    <Popover
      opened={attachments.attachOpened}
      onChange={attachments.openAttach}
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
            onClick={() => attachments.openAttach(!attachments.attachOpened)}
            aria-label={t("widget.openWebUi.attach")}
          >
            <IconPaperclip size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p={4}>
        {attachments.attachView === "root" ? (
          <Stack gap={2}>
            <MenuRow
              icon={<IconPaperclip size={16} />}
              label={t("widget.openWebUi.uploadFiles")}
              onClick={onUploadClick}
            />
            <MenuRow icon={<IconCamera size={16} />} label={t("widget.openWebUi.capture")} onClick={onCapture} />
            <MenuRow
              icon={<IconWorld size={16} />}
              label={t("widget.openWebUi.attachWebpage")}
              hasSub
              onClick={() => attachments.setAttachView("webpage")}
            />
            <MenuRow
              icon={<IconFile size={16} />}
              label={t("widget.openWebUi.attachFiles")}
              hasSub
              onClick={() => attachments.setAttachView("files")}
            />
            <MenuRow
              icon={<IconFileText size={16} />}
              label={t("widget.openWebUi.attachNotes")}
              hasSub
              onClick={() => attachments.setAttachView("notes")}
            />
            <MenuRow
              icon={<IconDatabase size={16} />}
              label={t("widget.openWebUi.attachKnowledge")}
              hasSub
              onClick={() => attachments.setAttachView("knowledge")}
            />
            <MenuRow
              icon={<IconMessage size={16} />}
              label={t("widget.openWebUi.referenceChats")}
              hasSub
              onClick={() => attachments.setAttachView("chats")}
            />
          </Stack>
        ) : (
          <Stack gap={4}>
            <Group gap={6} wrap="nowrap" px={4} pt={2}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => attachments.setAttachView("root")}
                aria-label={t("widget.openWebUi.back")}
              >
                <IconArrowLeft size={16} />
              </ActionIcon>
              <Text fw={600} size="sm">
                {attachViewTitle}
              </Text>
            </Group>

            {attachments.attachView === "webpage" ? (
              <Group gap={4} wrap="nowrap" p={4}>
                <TextInput
                  size="xs"
                  flex={1}
                  placeholder="https://…"
                  value={attachments.webInput}
                  onChange={(event) => attachments.setWebInput(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void attachments.addWebUrl();
                    }
                  }}
                />
                <ActionIcon
                  variant="light"
                  color="gray"
                  loading={attachments.isAddingWeb}
                  onClick={() => void attachments.addWebUrl()}
                  aria-label={t("widget.openWebUi.addUrl")}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
            ) : null}

            {attachments.attachView === "files" ? (
              <PickerList emptyLabel={t("widget.openWebUi.noFiles")} count={attachments.files.length}>
                {attachments.files.map((file) => (
                  <Checkbox
                    key={file.id}
                    size="xs"
                    label={file.name}
                    checked={attachments.fileItems.some((item) => item.id === file.id)}
                    onChange={() => attachments.toggleFile(file)}
                  />
                ))}
              </PickerList>
            ) : null}

            {attachments.attachView === "notes" ? (
              <PickerList emptyLabel={t("widget.openWebUi.noNotes")} count={attachments.notes.length}>
                {attachments.notes.map((note) => (
                  <Checkbox
                    key={note.id}
                    size="xs"
                    label={note.title}
                    checked={attachments.noteItems.some((item) => item.id === note.id)}
                    onChange={() => void attachments.toggleNote({ id: note.id, title: note.title })}
                  />
                ))}
              </PickerList>
            ) : null}

            {attachments.attachView === "knowledge" ? (
              <PickerList emptyLabel={t("widget.openWebUi.noKnowledge")} count={attachments.knowledge.length}>
                {attachments.knowledge.map((item) => (
                  <KnowledgeRow
                    key={item.id}
                    integrationId={integrationId ?? ""}
                    knowledgeId={item.id}
                    name={item.name ?? item.id}
                    selected={attachments.knowledgeIds.includes(item.id)}
                    onToggle={() => attachments.toggleKnowledge(item.id)}
                    isFileSelected={(id) => attachments.fileItems.some((file) => file.id === id)}
                    onToggleFile={attachments.toggleFile}
                    emptyFilesLabel={t("widget.openWebUi.noFiles")}
                  />
                ))}
              </PickerList>
            ) : null}

            {attachments.attachView === "chats" ? (
              <PickerList emptyLabel={t("widget.openWebUi.noChats")} count={chats.length}>
                {chats.map((chat) => (
                  <Checkbox
                    key={chat.id}
                    size="xs"
                    label={chat.title ?? chat.id}
                    checked={attachments.chatItems.some((item) => item.id === chat.id)}
                    onChange={() => void attachments.toggleChatReference(chat)}
                  />
                ))}
              </PickerList>
            ) : null}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

// Live microphone waveform driven by a Web Audio analyser node.
export function RecordingWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const color = getComputedStyle(canvas).color;
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const barCount = 56;
      const step = Math.max(1, Math.floor(data.length / barCount));
      const slot = width / barCount;
      for (let index = 0; index < barCount; index++) {
        const value = (data[index * step] ?? 0) / 255;
        const barHeight = Math.max(2, value * height);
        ctx.fillRect(index * slot + slot * 0.3, (height - barHeight) / 2, slot * 0.4, barHeight);
      }
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return <canvas ref={canvasRef} width={640} height={32} aria-hidden className={classes.waveformCanvas} />;
}

function TypingDots() {
  return (
    <span className={classes.typing} aria-label="…">
      <span className={classes.typingDot} />
      <span className={classes.typingDot} />
      <span className={classes.typingDot} />
    </span>
  );
}

export function MessageBubble({
  from,
  content,
  images,
  loading,
}: {
  from: ChatMessage["role"];
  content: string;
  images?: string[];
  loading?: boolean;
}) {
  const isUser = from === "user";
  // The assistant shows the Open WebUI brand logo (IconRobot is the fallback if
  // the image fails to load); the user keeps a plain icon avatar.
  const avatar = isUser ? (
    <Avatar size={22} radius="xl" variant="filled" color="gray" className={classes.avatar}>
      <IconUser size={14} />
    </Avatar>
  ) : (
    <Avatar size={22} radius="xl" src={getIconUrl("openWebUi")} alt="Open WebUI" className={classes.avatar}>
      <IconRobot size={14} />
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
        {loading && !content ? <TypingDots /> : null}
        {content ? (
          isUser ? (
            <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {content}
            </Text>
          ) : (
            <div className={classes.markdown}>
              <ReactMarkdown skipHtml>{content}</ReactMarkdown>
            </div>
          )
        ) : null}
      </Paper>
      {isUser ? avatar : null}
    </Group>
  );
}
