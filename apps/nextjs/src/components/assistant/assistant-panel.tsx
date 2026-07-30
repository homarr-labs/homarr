"use client";

import { createContext, useContext, useState } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import type { MessageStatus } from "@assistant-ui/react";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Popover,
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
  IconArchive,
  IconArrowUp,
  IconCheck,
  IconChevronUp,
  IconCopy,
  IconCommand,
  IconHistory,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconRestore,
  IconRobot,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";

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

const ToolPart = ({
  toolName,
  args,
  result,
  isError,
  status,
  approval,
  respondToApproval,
}: ToolCallMessagePartProps) => {
  const t = useScopedI18n("common.assistant");
  const completed = status?.type === "complete";
  const awaitingApproval = approval !== undefined && approval.approved === undefined && !approval.resolution;
  const denied = approval?.approved === false;
  const failed =
    !denied &&
    (isError === true ||
      status?.type === "incomplete" ||
      (typeof result === "object" && result !== null && "error" in result));
  const successful = completed && !denied && !failed;
  return (
    <Box className={classes.tool}>
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
      </Group>
      {awaitingApproval && (
        <Stack gap="xs" mt="sm">
          <Text size="sm">{t("approvalDescription")}</Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {JSON.stringify(args)}
          </Text>
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
      {!awaitingApproval && !denied && result !== undefined && (
        <Text size="xs" c="dimmed" mt={6} lineClamp={3}>
          {typeof result === "string" ? result : JSON.stringify(result)}
        </Text>
      )}
    </Box>
  );
};

const MessageActions = () => {
  const t = useScopedI18n("common.assistant");
  return (
    <ActionBarPrimitive.Root hideWhenRunning>
      <Group gap={2}>
        <Tooltip label={t("copy")}>
          <ActionBarPrimitive.Copy asChild>
            <ActionIcon variant="subtle" color="gray" size="sm">
              <IconCopy size={14} />
            </ActionIcon>
          </ActionBarPrimitive.Copy>
        </Tooltip>
        <Tooltip label={t("regenerate")}>
          <ActionBarPrimitive.Reload asChild>
            <ActionIcon variant="subtle" color="gray" size="sm">
              <IconRefresh size={14} />
            </ActionIcon>
          </ActionBarPrimitive.Reload>
        </Tooltip>
      </Group>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage = () => (
  <MessagePrimitive.Root className={`${classes.message} ${classes.userMessage}`}>
    <MessagePrimitive.Parts components={{ Text: TextPart }} />
  </MessagePrimitive.Root>
);

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
        tools: { Fallback: ToolPart },
      }}
    />
    <RuntimeError />
    <MessageActions />
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
        <ThreadListItemPrimitive.Archive asChild>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("archive")}>
            <IconArchive size={14} />
          </ActionIcon>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ActionIcon variant="subtle" color="red" size="sm" aria-label={t("delete")}>
            <IconTrash size={14} />
          </ActionIcon>
        </ThreadListItemPrimitive.Delete>
      </Group>
    </ThreadListItemPrimitive.Root>
  );
};

const ArchivedThreadListItem = () => {
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
            <ThreadListItemPrimitive.Title fallback={t("archivedConversation")} />
          </Button>
        </ThreadListItemPrimitive.Trigger>
        <ThreadListItemPrimitive.Unarchive asChild>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("restore")}>
            <IconRestore size={14} />
          </ActionIcon>
        </ThreadListItemPrimitive.Unarchive>
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
            <Text size="sm" fw={600} c="dimmed" px="xs" mt="sm">
              {t("archived")}
            </Text>
            <ThreadListPrimitive.Items archived components={{ ThreadListItem: ArchivedThreadListItem }} />
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

const Composer = () => {
  const t = useScopedI18n("common.assistant");
  const running = useAuiState((state) => state.thread.isRunning);
  return (
    <Box className={classes.composerWrap}>
      <ComposerPrimitive.Root className={classes.composer}>
        <ComposerPrimitive.Input className={classes.composerInput} placeholder={t("composerPlaceholder")} rows={1} />
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
      </ComposerPrimitive.Root>
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
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onMarkRead} aria-label={t("activity.dismiss")}>
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

  useWindowEvent("keydown", (event) => {
    if (opened && event.key === "Escape") onClose();
  });

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
        <dialog className={classes.floatingPanel} aria-label={t("title")} open>
          <Group className={classes.panelHeader} justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" color="red" radius="xl">
                <IconRobot size={18} />
              </ThemeIcon>
              <div>
                <Text fw={700} lh={1.1}>
                  {t("title")}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {isRunning ? t("activity.thinking") : t("subtitle")}
                </Text>
              </div>
            </Group>
            <Group gap={2} wrap="nowrap">
              <ConversationHistory />
              <Tooltip label={t("newConversation")}>
                <ThreadListPrimitive.New asChild>
                  <ActionIcon variant="subtle" color="gray" aria-label={t("newConversation")}>
                    <IconPlus size={17} />
                  </ActionIcon>
                </ThreadListPrimitive.New>
              </Tooltip>
              <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label={t("close")}>
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
      )}
    </>
  );
};
