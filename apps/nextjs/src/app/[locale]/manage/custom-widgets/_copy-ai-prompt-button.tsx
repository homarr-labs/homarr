"use client";

import { Button } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/core";
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
      await navigator.clipboard.writeText(
        buildCustomWidgetAiPrompt(undefined, rawResponse, currentConfig, request, documentationUrl),
      );
      showSuccessNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopied") });
    } catch {
      showErrorNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopyError") });
    }
  };

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
};
