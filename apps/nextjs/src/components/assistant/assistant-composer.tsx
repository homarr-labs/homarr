"use client";

import { useLayoutEffect, useRef } from "react";
import { ComposerPrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";
import { ActionIcon, Box, Button, Group, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconArrowUp, IconMessage, IconPaperclip, IconPlayerStop, IconQuote, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { ComposerTriggers } from "./assistant-composer-triggers";
import type { AssistantConversationControls } from "./assistant-conversation-controls";
import { ConversationContext } from "./assistant-conversation-context";
import { useAssistantPreferences } from "./assistant-context";
import { Attachment, ContextDirectiveChip } from "./assistant-message-content";
import type { AssistantPendingAction } from "./assistant-pending-action";
import { isAssistantProviderUnavailable } from "./assistant-provider-quota";
import { HomarrProviderQuota, RuntimeControls } from "./assistant-runtime-controls";

type ComposerProps = AssistantConversationControls & { pendingAction: AssistantPendingAction | undefined };

export const Composer = (props: ComposerProps) => {
  const t = useI18n("assistant");
  const preferences = useAssistantPreferences();
  const running = useAuiState((state) => state.thread.isRunning);
  const hasPendingAction = props.pendingAction !== undefined;
  const providerUnavailable = isAssistantProviderUnavailable({
    provider: preferences.provider,
    signedIn: preferences.providerUser !== null,
    remaining: preferences.quota?.remaining,
  });
  const sendBlocked = hasPendingAction || providerUnavailable;
  let sendLabel = t("send");
  if (providerUnavailable) sendLabel = t("providerQuota.unavailableDescription");
  if (hasPendingAction) sendLabel = t("pendingAction.sendBlocked");
  const composerInputRef = useRef<HTMLDivElement>(null);
  const composerLabel = t("composerPlaceholder");

  useLayoutEffect(() => {
    const editor = composerInputRef.current?.querySelector<HTMLElement>(".aui-lexical-input");
    if (!editor) return;
    editor.setAttribute("aria-label", composerLabel);
    return () => {
      if (editor.getAttribute("aria-label") === composerLabel) editor.removeAttribute("aria-label");
    };
  }, [composerLabel]);

  return (
    <Box className={classes.composerWrap}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.AttachmentDropzone className={classes.composerDropzone}>
          <ComposerPrimitive.Root
            className={classes.composer}
            data-pending-action={hasPendingAction || undefined}
            onSubmit={(event) => {
              if (sendBlocked) event.preventDefault();
            }}
          >
            <ComposerTriggers />
            <ComposerPrimitive.Quote className={classes.composerQuote}>
              <IconQuote size={15} />
              <ComposerPrimitive.QuoteText className={classes.composerQuoteText} />
              <ComposerPrimitive.QuoteDismiss asChild>
                <ActionIcon variant="subtle" color="gray" size="xs" aria-label={t("dismissQuote")}>
                  <IconX size={12} />
                </ActionIcon>
              </ComposerPrimitive.QuoteDismiss>
            </ComposerPrimitive.Quote>
            <ComposerPrimitive.Attachments>{() => <Attachment removable />}</ComposerPrimitive.Attachments>
            <Group className={classes.composerRow} gap="xs" wrap="nowrap" align="flex-end">
              <Group gap={2} wrap="nowrap">
                <Tooltip label={t("attachments.add")}>
                  <ComposerPrimitive.AddAttachment asChild>
                    <ActionIcon variant="subtle" color="gray" size="lg" aria-label={t("attachments.add")}>
                      <IconPaperclip size={17} />
                    </ActionIcon>
                  </ComposerPrimitive.AddAttachment>
                </Tooltip>
              </Group>
              <LexicalComposerInput
                ref={composerInputRef}
                className={classes.composerInput}
                data-assistant-composer-input
                placeholder={composerLabel}
                directiveChip={ContextDirectiveChip}
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- opening the assistant is an explicit intent to compose
                autoFocus={props.autoFocusComposer}
                data-autofocus={props.autoFocusComposer ? true : undefined}
              />
              {running ? (
                <ComposerPrimitive.Cancel asChild>
                  <ActionIcon color="red" variant="light" size="lg" aria-label={t("stop")}>
                    <IconPlayerStop size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Cancel>
              ) : (
                <ComposerPrimitive.Send asChild>
                  <ActionIcon variant="filled" size="lg" aria-label={sendLabel} disabled={sendBlocked}>
                    <IconArrowUp size={18} />
                  </ActionIcon>
                </ComposerPrimitive.Send>
              )}
            </Group>
            <Group className={classes.composerFooter} justify="space-between" gap="xs" wrap="nowrap">
              <Group className={classes.composerControls} gap={5} wrap="nowrap">
                <RuntimeControls {...props} />
                <HomarrProviderQuota />
                <ConversationContext />
              </Group>
            </Group>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </Box>
  );
};

export const usePendingActionCopy = (action: AssistantPendingAction | undefined) => {
  const t = useI18n("assistant");
  if (!action) return undefined;
  if (action.kind === "question") {
    return { title: t("pendingAction.answerTitle"), detail: action.detail ?? t("pendingAction.answerFallback") };
  }
  if (action.kind === "form") {
    const isBoardSettings = action.toolName === "configure_board_settings";
    return {
      title: isBoardSettings ? t("pendingAction.boardFormTitle") : t("pendingAction.formTitle"),
      detail: action.detail ?? (isBoardSettings ? t("configureBoardSettings.title") : t("configureApp.title")),
    };
  }
  const tool = action.toolName.replaceAll("_", " ");
  return { title: t("activity.approval"), detail: action.detail ? `${tool} · ${action.detail}` : tool };
};

export const PendingActionBanner = ({ pendingAction }: { pendingAction: AssistantPendingAction | undefined }) => {
  const t = useI18n("assistant");
  const copy = usePendingActionCopy(pendingAction);
  if (!copy || pendingAction?.kind === "question") return null;

  return (
    <Box component="output" className={classes.pendingActionBanner}>
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color="yellow" radius="xl">
          <IconMessage size={17} />
        </ThemeIcon>
        <Stack gap={0} flex={1} miw={0}>
          <Text size="sm" fw={700}>
            {copy.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {copy.detail}
          </Text>
        </Stack>
        <ThreadPrimitive.ScrollToBottom asChild>
          <Button variant="light" color="yellow" size="compact-sm">
            {t("pendingAction.review")}
          </Button>
        </ThreadPrimitive.ScrollToBottom>
      </Group>
    </Box>
  );
};

export const PendingQuestionDock = ({
  pendingAction,
  setTarget,
}: {
  pendingAction: AssistantPendingAction | undefined;
  setTarget: (target: HTMLDivElement | null) => void;
}) => {
  const t = useI18n("assistant");
  if (pendingAction?.kind !== "question") return null;

  return (
    <Box component="section" className={classes.pendingQuestionDock} aria-label={t("pendingAction.answerTitle")}>
      <div ref={setTarget} className={classes.pendingQuestionTarget} />
    </Box>
  );
};
