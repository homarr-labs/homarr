import { useState } from "react";
import type { PropsWithChildren } from "react";
import { ThreadPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ActionIcon, Box, Button, Popover, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import {
  IconActivityHeartbeat,
  IconApps,
  IconPalette,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconShield,
  IconShieldCheck,
} from "@tabler/icons-react";

import { useAssistantNotifications, useAssistantSourceAction, useAssistantSourceBindings, useI18n } from "./bindings";

import classes from "./assistant-panel.module.css";
import { useAssistantAutoApproval } from "./assistant-auto-approval";
import type { AssistantConversationControls } from "./assistant-conversation-controls";
import { useAssistantPreferences } from "./assistant-context";
import { getPendingAssistantAction } from "./assistant-pending-action";
import { isAssistantProviderUnavailable } from "./assistant-provider-quota";

const compactSuggestionVars = () => ({
  root: {
    "--button-fz": "calc(var(--mantine-font-size-sm) * var(--board-canvas-ui-scale, 1))",
    "--button-bg": "rgb(from var(--mantine-color-default) r g b / var(--opacity, 1))",
    "--button-hover": "rgb(from var(--mantine-color-default-hover) r g b / var(--opacity, 1))",
    "--button-bd": "1px solid rgb(from var(--mantine-color-default-border) r g b / var(--opacity, 1))",
  },
});

export const AutoApprovalControl = ({ compact = false }: { compact?: boolean }) => {
  const action = useAssistantSourceAction("approve");
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
            disabled={!action.enabled}
            title={action.enabled ? undefined : action.reason}
            variant={enabled ? "default" : "light"}
            color={enabled ? "gray" : "green"}
            leftSection={<IconShieldCheck size={16} />}
            onClick={() => {
              if (!action.enabled) return;
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
  const bindings = useAssistantSourceBindings();
  const { showErrorNotification, showSuccessNotification } = useAssistantNotifications();
  const action = useAssistantSourceAction("refresh");
  const t = useI18n("assistant.refresh");

  const refresh = async () => {
    if (!action.enabled) return;
    try {
      await onRefresh();
      if (bindings.scope.signal.aborted) return;
      showSuccessNotification({ title: t("completeTitle"), message: t("completeDescription") });
    } catch {
      if (bindings.scope.signal.aborted) return;
      showErrorNotification({ title: t("failedTitle"), message: t("failedDescription") });
    }
  };

  return (
    <Tooltip label={!action.enabled ? action.reason : isRefreshing ? t("working") : t("action")}>
      <ActionIcon
        className={classes.panelAction}
        variant="subtle"
        color="gray"
        loading={isRefreshing}
        disabled={!action.enabled}
        loaderProps={{ type: "bars" }}
        onClick={() => void refresh()}
        aria-label={isRefreshing ? t("working") : t("action")}
      >
        <IconRefresh size={17} />
      </ActionIcon>
    </Tooltip>
  );
};

const AssistantSuggestion = ({
  prompt,
  send = false,
  children,
}: PropsWithChildren<{ prompt: string; send?: boolean }>) => {
  const aui = useAui();
  const action = useAssistantSourceAction("send");
  const preferences = useAssistantPreferences();
  const hasPendingAction = useAuiState(
    (state) => getPendingAssistantAction(state.thread.messages.at(-1)) !== undefined,
  );
  const canSend = () =>
    action.enabled &&
    preferences.provider !== null &&
    !preferences.isLoading &&
    !isAssistantProviderUnavailable({
      provider: preferences.provider,
      signedIn: preferences.providerUser !== null,
      remaining: preferences.quota?.remaining,
    }) &&
    getPendingAssistantAction(aui.thread().getState().messages.at(-1)) === undefined;
  const sendEnabled = send && !hasPendingAction && canSend();
  return (
    <ThreadPrimitive.Suggestion
      prompt={prompt}
      send={sendEnabled}
      clearComposer
      asChild
      onClick={(event) => {
        if (!sendEnabled || canSend()) return;
        event.preventDefault();
        aui.composer().setText(prompt);
      }}
    >
      {children}
    </ThreadPrimitive.Suggestion>
  );
};

export const EmptyThread = ({ compact = false }: { compact?: boolean }) => {
  const t = useI18n("assistant");
  if (compact) {
    return (
      <ThreadPrimitive.Empty>
        <Box className={classes.empty} data-compact>
          <Box className={classes.suggestions}>
            <AssistantSuggestion prompt={t("suggestions.health.prompt")} send>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconActivityHeartbeat size="1em" />}
              >
                {t("suggestions.health.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.explore.prompt")} send>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconApps size="1em" />}
              >
                {t("suggestions.explore.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.media.prompt")} send>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconSearch size="1em" />}
              >
                {t("suggestions.media.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.style.prompt")} send>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconPalette size="1em" />}
              >
                {t("suggestions.style.label")}
              </Button>
            </AssistantSuggestion>
          </Box>
        </Box>
      </ThreadPrimitive.Empty>
    );
  }

  return (
    <ThreadPrimitive.Empty>
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
          <Box className={classes.suggestions}>
            <AssistantSuggestion prompt={t("suggestions.health.prompt")}>
              <Button
                variant="default"
                className={classes.suggestion}
                leftSection={<IconActivityHeartbeat size={18} />}
              >
                {t("suggestions.health.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.explore.prompt")}>
              <Button variant="default" className={classes.suggestion} leftSection={<IconApps size={18} />}>
                {t("suggestions.explore.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.media.prompt")}>
              <Button variant="default" className={classes.suggestion} leftSection={<IconSearch size={18} />}>
                {t("suggestions.media.label")}
              </Button>
            </AssistantSuggestion>
            <AssistantSuggestion prompt={t("suggestions.style.prompt")}>
              <Button variant="default" className={classes.suggestion} leftSection={<IconPalette size={18} />}>
                {t("suggestions.style.label")}
              </Button>
            </AssistantSuggestion>
          </Box>
        </Stack>
      </Box>
    </ThreadPrimitive.Empty>
  );
};
