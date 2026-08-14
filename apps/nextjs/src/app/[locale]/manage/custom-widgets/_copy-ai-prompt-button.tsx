"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";

import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/authoring-prompt";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

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

  const handleCopy = async () => {
    try {
      const prompt = buildCustomWidgetAiPrompt(undefined, rawResponse, currentConfig, request, documentationUrl);
      await navigator.clipboard.writeText(prompt);
      showSuccessNotification({
        title: t("action.copyAiPrompt"),
        message: t("notification.aiPromptCopiedWithCount", { count: prompt.length }),
      });
    } catch {
      showErrorNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopyError") });
    }
  };

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
};
