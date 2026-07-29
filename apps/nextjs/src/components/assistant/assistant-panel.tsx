"use client";

import { useState } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { ActionIcon, Box, Button, Drawer, Group, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconActivityHeartbeat,
  IconApps,
  IconArchive,
  IconArrowUp,
  IconCheck,
  IconCopy,
  IconCommand,
  IconMenu2,
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
  onClose: () => void;
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
      <Box className={classes.messageError}>{t("responseError")}</Box>
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

const ThreadListItem = () => {
  const t = useScopedI18n("common.assistant");
  return (
    <ThreadListItemPrimitive.Root className={classes.historyItem}>
      <Group gap={4} wrap="nowrap">
        <ThreadListItemPrimitive.Trigger asChild>
          <Button variant="subtle" color="gray" size="compact-sm" justify="flex-start" flex={1} style={{ minWidth: 0 }}>
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
  return (
    <ThreadListItemPrimitive.Root className={classes.historyItem}>
      <Group gap={4} wrap="nowrap">
        <ThreadListItemPrimitive.Trigger asChild>
          <Button variant="subtle" color="gray" size="compact-sm" justify="flex-start" flex={1} style={{ minWidth: 0 }}>
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

const ThreadHistory = ({ opened, onClose }: { opened: boolean; onClose: () => void }) => {
  const t = useScopedI18n("common.assistant");
  const isMobile = useMediaQuery("(max-width: 48em)");
  const hidden = isMobile && !opened;
  return (
    <Stack
      className={classes.history}
      gap="xs"
      p="sm"
      data-opened={opened}
      inert={hidden ? true : undefined}
      aria-hidden={hidden || undefined}
    >
      <Group gap="xs" wrap="nowrap">
        <ThreadListPrimitive.New asChild>
          <Button variant="light" leftSection={<IconPlus size={16} />} fullWidth onClick={onClose}>
            {t("newConversation")}
          </Button>
        </ThreadListPrimitive.New>
        <ActionIcon
          className={classes.historyClose}
          variant="subtle"
          color="gray"
          onClick={onClose}
          aria-label={t("closeHistory")}
        >
          <IconX size={17} />
        </ActionIcon>
      </Group>
      <Group gap="xs" px="xs" mt="xs">
        <IconHistory size={14} />
        <Text size="sm" fw={600} c="dimmed">
          {t("conversations")}
        </Text>
      </Group>
      <ScrollArea flex={1} type="auto">
        <Stack gap={3}>
          <ThreadListPrimitive.Items components={{ ThreadListItem }} />
          <Text size="sm" fw={600} c="dimmed" px="xs" mt="sm">
            {t("archived")}
          </Text>
          <ThreadListPrimitive.Items archived components={{ ThreadListItem: ArchivedThreadListItem }} />
        </Stack>
      </ScrollArea>
    </Stack>
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

export const AssistantPanel = ({ opened, onClose }: AssistantPanelProps) => {
  const t = useScopedI18n("common.assistant");
  const [historyOpened, setHistoryOpened] = useState(false);
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="min(52rem, 100vw)"
      zIndex={300}
      className={classes.drawer}
      classNames={{ content: classes.content, body: classes.body }}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="red" radius="xl">
            <IconRobot size={18} />
          </ThemeIcon>
          <div>
            <Text fw={700} lh={1.1}>
              {t("title")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("subtitle")}
            </Text>
          </div>
        </Group>
      }
      closeButtonProps={{ icon: <IconX size={18} />, "aria-label": t("close") }}
    >
      <Box className={classes.shell}>
        <ThreadHistory opened={historyOpened} onClose={() => setHistoryOpened(false)} />
        <ThreadPrimitive.Root className={classes.thread}>
          <ActionIcon
            className={classes.mobileHistoryButton}
            variant="default"
            onClick={() => setHistoryOpened(true)}
            aria-label={t("openHistory")}
          >
            <IconMenu2 size={17} />
          </ActionIcon>
          <ThreadPrimitive.Viewport className={classes.viewport}>
            <Box className={classes.messages}>
              <EmptyThread />
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
            </Box>
            <ThreadPrimitive.ScrollToBottom asChild>
              <ActionIcon
                pos="absolute"
                bottom={110}
                left="50%"
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
      </Box>
    </Drawer>
  );
};
