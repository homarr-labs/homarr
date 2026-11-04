"use client";

import { useState } from "react";
import type { AssistantState } from "@assistant-ui/react";
import { AuiIf, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ActionIcon, Box, Button, Popover, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconRefresh, IconRobot, IconShield, IconShieldCheck } from "@tabler/icons-react";

import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { useAssistantAutoApproval } from "./assistant-auto-approval";
import type { AssistantConversationControls } from "./assistant-conversation-controls";
import { useAssistantPrompts } from "./assistant-prompts";
import { useAssistantHistoryState } from "./assistant-history-state";

const threadIsEmpty = (state: AssistantState) => state.thread.isEmpty && !state.thread.isLoading;

const compactSuggestionVars = () => ({
  root: {
    "--button-fz": "calc(var(--mantine-font-size-sm) * var(--board-canvas-ui-scale, 1))",
    "--button-bg": "rgb(from var(--mantine-color-default) r g b / var(--opacity, 1))",
    "--button-hover": "rgb(from var(--mantine-color-default-hover) r g b / var(--opacity, 1))",
    "--button-bd": "1px solid rgb(from var(--mantine-color-default-border) r g b / var(--opacity, 1))",
  },
});

export const AutoApprovalControl = ({ compact = false }: { compact?: boolean }) => {
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
        {compact ? (
          <ActionIcon
            className={classes.composerApproval}
            variant={enabled ? "light" : "subtle"}
            color={enabled ? "green" : "gray"}
            size="sm"
            onClick={() => setOpened((current) => !current)}
            aria-label={enabled ? t("enabled") : t("label")}
            aria-pressed={enabled}
            title={enabled ? t("enabled") : t("label")}
          >
            {enabled ? <IconShieldCheck size={18} /> : <IconShield size={18} />}
          </ActionIcon>
        ) : (
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
        )}
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

export const ViewRefreshAction = ({
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

const PromptSuggestions = ({ compact }: { compact: boolean }) => {
  const prompts = useAssistantPrompts();
  return (
    <Box className={classes.suggestions}>
      {prompts.map(({ id, label, prompt, description, Icon }) => (
        <ThreadPrimitive.Suggestion key={id} prompt={prompt} send={false} clearComposer={false} asChild>
          <Button
            variant="default"
            size="sm"
            className={compact ? classes.compactSuggestion : classes.suggestion}
            vars={compact ? compactSuggestionVars : undefined}
            leftSection={<Icon size="1em" />}
            title={description}
          >
            {label}
          </Button>
        </ThreadPrimitive.Suggestion>
      ))}
    </Box>
  );
};

export const EmptyThread = ({ compact = false }: { compact?: boolean }) => {
  const t = useI18n("assistant");
  const conversationId = useAuiState((state) => state.threadListItem.id);
  const { failedThreadIds } = useAssistantHistoryState();
  if (failedThreadIds.has(conversationId)) return null;
  if (compact) {
    return (
      <AuiIf condition={threadIsEmpty}>
        <Box className={classes.empty} data-compact>
          <PromptSuggestions compact />
        </Box>
      </AuiIf>
    );
  }

  return (
    <AuiIf condition={threadIsEmpty}>
      <Box className={classes.empty}>
        <Stack align="center" gap="lg" maw={560} w="100%">
          <Stack align="center" gap="xs" maw={430} ta="center">
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
          <PromptSuggestions compact={false} />
          <Text size="xs" c="dimmed">
            {t("commands.hint")}
          </Text>
        </Stack>
      </Box>
    </AuiIf>
  );
};
