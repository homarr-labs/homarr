"use client";

import { Button, Menu } from "@mantine/core";
import { IconChevronDown, IconFileText, IconSparkles } from "@tabler/icons-react";

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

  const handleCopy = async (includeSkill = false) => {
    try {
      const prompt = includeSkill
        ? await import("@homarr/custom-widgets/embedded-authoring-prompt").then(
            ({ buildCustomWidgetAiPromptWithEmbeddedSkill }) =>
              buildCustomWidgetAiPromptWithEmbeddedSkill(
                undefined,
                rawResponse,
                currentConfig,
                request,
                documentationUrl,
              ),
          )
        : buildCustomWidgetAiPrompt(undefined, rawResponse, currentConfig, request, documentationUrl);
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
    <Button.Group w="100%">
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
      <Menu position="bottom-end" withinPortal={false}>
        <Menu.Target>
          <Button type="button" variant="light" px="xs" aria-label={t("action.copyAiPromptWithSkill")}>
            <IconChevronDown size={16} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconSparkles size={16} />} onClick={() => void handleCopy()}>
            {t("action.copyAiPrompt")}
          </Menu.Item>
          <Menu.Item leftSection={<IconFileText size={16} />} onClick={() => void handleCopy(true)}>
            {t("action.copyAiPromptWithSkill")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Button.Group>
  );
};
