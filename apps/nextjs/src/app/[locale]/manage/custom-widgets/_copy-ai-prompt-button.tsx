"use client";

import { Button, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconSparkles } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/core";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface CopyAiPromptButtonProps {
  rawResponse?: string | null;
  currentConfig?: Record<string, unknown> | null;
}

export const CopyAiPromptButton = ({ rawResponse, currentConfig }: CopyAiPromptButtonProps) => {
  const t = useScopedI18n("customWidget");
  const [opened, { open, close }] = useDisclosure(false);
  const { data: schema, isLoading } = clientApi.customWidget.schema.useQuery();

  const handleCopy = async () => {
    if (!schema) return;
    try {
      await navigator.clipboard.writeText(buildCustomWidgetAiPrompt(schema, rawResponse, currentConfig));
      close();
      showSuccessNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopied") });
    } catch {
      showErrorNotification({ title: t("action.copyAiPrompt"), message: t("notification.aiPromptCopyError") });
    }
  };

  return (
    <Popover opened={opened} onClose={close} width={320} position="bottom" shadow="md" withinPortal>
      <Popover.Target>
        <Button
          type="button"
          variant="light"
          leftSection={<IconSparkles size={16} />}
          onClick={open}
          loading={isLoading}
          disabled={!schema}
          fullWidth
          size="sm"
        >
          {t("action.copyAiPrompt")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm">{t("notification.aiPromptDescription")}</Text>
          {!rawResponse && (
            <Text size="xs" c="dimmed" fs="italic">
              {t("notification.aiPromptNoResponse")}
            </Text>
          )}
          <Button type="button" leftSection={<IconCopy size={16} />} onClick={() => void handleCopy()} fullWidth>
            {t("notification.aiPromptCopy")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
