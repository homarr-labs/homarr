import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ThreadListItemPrimitive, ThreadListPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ActionIcon, Button, Group, Popover, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import {
  IconCheck,
  IconDotsVertical,
  IconFileExport,
  IconHistory,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import { useAssistantNotifications, useAssistantSourceAction, useAssistantSourceBindings, useI18n } from "./bindings";
import { InlineConfirmActionIcon } from "@homarr/ui/inline-confirm-action";

import classes from "./assistant-panel.module.css";
import {
  buildAssistantConversationMarkdown,
  getAssistantConversationExportFilename,
} from "./assistant-conversation-export";

export const downloadAssistantMarkdown = (markdown: string, filename: string) => {
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

const HistorySelectContext = createContext<() => void>(() => undefined);

const ThreadListItem = () => {
  const bindings = useAssistantSourceBindings();
  const { showErrorNotification } = useAssistantNotifications();
  const exportAction = useAssistantSourceAction("exportConversation");
  const renameAction = useAssistantSourceAction("renameConversation");
  const deleteAction = useAssistantSourceAction("deleteConversation");
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
  const ownerRef = useRef<{ active: boolean; remoteId: string | undefined }>({ active: true, remoteId });

  useEffect(() => {
    const owner = { active: true, remoteId };
    ownerRef.current = owner;
    return () => {
      owner.active = false;
    };
  }, [remoteId]);

  useEffect(() => {
    if (renameOpened) renameInputRef.current?.focus();
  }, [renameOpened]);

  const exportConversation = async () => {
    if (!remoteId || exporting || !exportAction.enabled || !bindings.readConversation) return;
    const owner = ownerRef.current;
    setExporting(true);
    try {
      const conversation = await bindings.readConversation(remoteId, bindings.scope.signal);
      if (!owner.active || bindings.scope.signal.aborted) return;
      if (conversation.thread.id !== remoteId) throw new Error("Assistant conversation identity mismatch");
      const markdown = buildAssistantConversationMarkdown(conversation);
      downloadAssistantMarkdown(
        markdown,
        getAssistantConversationExportFilename(conversation.thread.title ?? title, remoteId),
      );
    } catch {
      if (!owner.active || bindings.scope.signal.aborted) return;
      showErrorNotification({
        title: t("exportConversation.failedTitle"),
        message: t("exportConversation.failedDescription"),
      });
    } finally {
      if (owner.active && !bindings.scope.signal.aborted) setExporting(false);
    }
  };

  const renameConversation = async () => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle || renaming || !renameAction.enabled) return;
    const owner = ownerRef.current;
    setRenaming(true);
    try {
      await aui.threadListItem().rename(trimmedTitle);
      if (!owner.active || bindings.scope.signal.aborted) return;
      setRenameOpened(false);
      setActionsOpened(false);
    } catch {
      if (!owner.active || bindings.scope.signal.aborted) return;
      showErrorNotification({
        title: t("renameConversation.failedTitle"),
        message: t("renameConversation.failedDescription"),
      });
    } finally {
      if (owner.active && !bindings.scope.signal.aborted) setRenaming(false);
    }
  };

  const deleteConversation = async () => {
    if (!deleteAction.enabled) return;
    const owner = ownerRef.current;
    try {
      await aui.threadListItem().delete();
    } catch {
      if (!owner.active || bindings.scope.signal.aborted) return;
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
          disabled={!nextTitle.trim() || !renameAction.enabled}
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
            aria-label={t("renameConversation.action")}
            disabled={!renameAction.enabled}
            title={renameAction.enabled ? t("renameConversation.action") : renameAction.reason}
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
            disabled={!remoteId || !exportAction.enabled || !bindings.readConversation}
            title={
              exportAction.enabled && bindings.readConversation ? t("exportConversation.action") : exportAction.reason
            }
            aria-label={t("exportConversation.action")}
            onClick={() => void exportConversation()}
          >
            <IconFileExport size={14} />
          </ActionIcon>
          <InlineConfirmActionIcon
            variant="subtle"
            color="red"
            size="sm"
            title={deleteAction.enabled ? actionT("delete") : deleteAction.reason}
            disabled={!deleteAction.enabled}
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

const ThreadHistory = ({ onSelect, compact }: { onSelect: () => void; compact: boolean }) => {
  const newAction = useAssistantSourceAction("newConversation");
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
        {compact ? (
          <Group justify="space-between" gap="xs" wrap="nowrap" px="xs">
            <Text size="sm" fw={600}>
              {t("conversations")}
            </Text>
            <ThreadListPrimitive.New asChild>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                title={t("newConversation")}
                aria-label={t("newConversation")}
                disabled={!newAction.enabled}
                onClick={onSelect}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </ThreadListPrimitive.New>
          </Group>
        ) : (
          <>
            <Group gap="xs" wrap="nowrap" px={4} pt={4}>
              <ThreadListPrimitive.New asChild>
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  fullWidth
                  onClick={onSelect}
                  disabled={!newAction.enabled}
                  title={newAction.enabled ? undefined : newAction.reason}
                >
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
          </>
        )}
        <ScrollArea.Autosize mah="min(24rem, 55dvh)" type="auto" scrollbars="y" offsetScrollbars>
          <Stack gap={3}>
            <ThreadListPrimitive.Items>
              {({ threadListItem }) => {
                const itemTitle = threadListItem.title ?? t("newConversation");
                if (!compact && normalizedQuery && !itemTitle.toLocaleLowerCase().includes(normalizedQuery))
                  return null;
                return <ThreadListItem />;
              }}
            </ThreadListPrimitive.Items>
            {!compact && normalizedQuery && !hasMatchingConversation && (
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

export const ConversationHistory = ({ compact = false }: { compact?: boolean }) => {
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
          size={compact ? "xs" : "compact-sm"}
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
      <Popover.Dropdown className={compact ? classes.widgetHistoryDropdown : undefined} p={0}>
        <ThreadHistory compact={compact} onSelect={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
};
