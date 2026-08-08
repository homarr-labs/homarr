"use client";

import { Button, Group } from "@mantine/core";
import { IconCopy, IconRobot, IconSparkles } from "@tabler/icons-react";

import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/authoring-prompt";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";

interface CopyAiPromptButtonProps {
  rawResponse?: string | null;
  currentConfig?: Record<string, unknown> | null;
  request?: string | null;
  documentationUrl?: string | null;
}

export const CopyAiPromptButton = ({
  rawResponse,
  currentConfig,
  request,
  documentationUrl,
}: CopyAiPromptButtonProps) => {
  const t = useScopedI18n("customWidget");
  const assistant = useOptionalHomarrAssistant();
  const prompt = () => buildCustomWidgetAiPrompt(undefined, rawResponse, currentConfig, request, documentationUrl);

  const handleAssistant = () => {
    if (!assistant?.enabled || !assistant.sendPrompt(prompt())) return;
    showSuccessNotification({ title: t("action.aiPrompt"), message: t("notification.aiPromptSent") });
  };

  const handleCopy = async () => {
    try {
      const value = prompt();
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
      <Button
        type="button"
        variant="light"
        leftSection={<IconSparkles size={16} />}
        onClick={() => void handleCopy()}
        fullWidth
        size="sm"
      >
        {t("action.copyAiPrompt")}
      </Button>
    );
  }

  return (
    <Group grow gap="xs" wrap="nowrap">
      <Button
        type="button"
        variant="light"
        leftSection={<IconRobot size={16} />}
        onClick={handleAssistant}
        disabled={!request?.trim()}
        size="sm"
      >
        {t("action.aiPrompt")}
      </Button>
      <Button
        type="button"
        variant="default"
        leftSection={<IconCopy size={16} />}
        onClick={() => void handleCopy()}
        size="sm"
      >
        {t("notification.aiPromptCopy")}
      </Button>
    </Group>
  );
};
