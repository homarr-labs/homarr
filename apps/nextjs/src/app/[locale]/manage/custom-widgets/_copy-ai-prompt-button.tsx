"use client";

import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconCopy, IconRobot } from "@tabler/icons-react";

import { buildCustomWidgetAiPrompt, buildCustomWidgetAssistantPrompt } from "@homarr/custom-widgets/authoring-prompt";
import type { CustomWidgetAiDiagnostic, CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";

interface CopyAiPromptButtonProps {
  rawResponse?: string | null;
  draft: CustomWidgetAiDraft;
  diagnostics: readonly CustomWidgetAiDiagnostic[];
  request?: string | null;
  documentationUrl?: string | null;
}

export const CopyAiPromptButton = ({
  rawResponse,
  draft,
  diagnostics,
  request,
  documentationUrl,
}: CopyAiPromptButtonProps) => {
  const t = useI18n("customWidget");
  const assistant = useOptionalHomarrAssistant();

  const handleAssistant = () => {
    const prompt = buildCustomWidgetAssistantPrompt(
      undefined,
      rawResponse,
      draft,
      request,
      documentationUrl,
      diagnostics,
    );
    if (!assistant?.enabled || !assistant.sendPrompt(prompt)) return;
    showSuccessNotification({ title: t("action.aiPrompt"), message: t("notification.aiPromptSent") });
  };

  const handleCopy = async () => {
    try {
      const value = buildCustomWidgetAiPrompt(undefined, rawResponse, draft, request, documentationUrl, diagnostics);
      await navigator.clipboard.writeText(value);
      showSuccessNotification({
        title: t("action.copyAiPrompt"),
        message: t("notification.aiPromptCopiedWithCount", { count: value.length }),
      });
    } catch {
      showErrorNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopyError") });
    }
  };

  if (!assistant?.enabled) {
    return (
      <Tooltip label={t("action.copyAiPrompt")}>
        <ActionIcon
          type="button"
          variant="subtle"
          size="lg"
          aria-label={t("action.copyAiPrompt")}
          onClick={() => void handleCopy()}
        >
          <IconCopy size={16} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label={t("action.aiPrompt")}>
        <ActionIcon
          type="button"
          variant="subtle"
          size="lg"
          aria-label={t("action.aiPrompt")}
          onClick={handleAssistant}
          disabled={!request?.trim()}
        >
          <IconRobot size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("action.copyAiPrompt")}>
        <ActionIcon
          type="button"
          variant="subtle"
          size="lg"
          aria-label={t("action.copyAiPrompt")}
          onClick={() => void handleCopy()}
        >
          <IconCopy size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
