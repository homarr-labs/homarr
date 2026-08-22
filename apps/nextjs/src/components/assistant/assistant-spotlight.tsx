"use client";

import { Group, Kbd, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowUp, IconRobot } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface AssistantPromptInteractionOptions {
  sendPrompt: (prompt: string) => boolean;
  onPromptAccepted: () => void;
  prompt?: string;
  canSend?: boolean;
}

const AssistantPromptDetail = () => {
  const t = useI18n("assistant");
  return (
    <Group px="md" py="sm" wrap="nowrap">
      <ThemeIcon variant="light" radius="xl">
        <IconRobot size={17} />
      </ThemeIcon>
      <Stack gap={1}>
        <Text fw={600}>{t("spotlightPrompt.title")}</Text>
        <Text size="xs" c="dimmed">
          {t("spotlightPrompt.description")}
        </Text>
      </Stack>
    </Group>
  );
};

const AssistantPromptAction = ({ hasPrompt }: { hasPrompt: boolean }) => {
  const t = useI18n("assistant");
  return (
    <Group w="100%" px="md" py="xs" justify="space-between" wrap="nowrap" opacity={hasPrompt ? 1 : 0.6}>
      <Group gap="sm" wrap="nowrap">
        <IconArrowUp size={18} />
        <Text>{hasPrompt ? t("spotlightPrompt.send") : t("spotlightPrompt.empty")}</Text>
      </Group>
      <Kbd size="sm">Enter</Kbd>
    </Group>
  );
};

export const createAssistantPromptInteraction = ({
  sendPrompt,
  onPromptAccepted,
  prompt = "",
  canSend = true,
}: AssistantPromptInteractionOptions) => {
  if (!canSend) return { type: "none" as const };

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > 0) {
    return {
      type: "javaScript" as const,
      onSelect: () => {
        if (sendPrompt(trimmedPrompt)) onPromptAccepted();
      },
      closeSpotlightOnTrigger: false,
    };
  }

  return {
    type: "children",
    option: {},
    DetailComponent: AssistantPromptDetail,
    useActions: (_options: Record<string, unknown>, query: string) => {
      const nextPrompt = query.trim();
      return [
        {
          key: "send-assistant-prompt",
          Component: () => <AssistantPromptAction hasPrompt={nextPrompt.length > 0} />,
          useInteraction: () => ({
            type: "javaScript" as const,
            onSelect: () => {
              if (nextPrompt.length > 0 && sendPrompt(nextPrompt)) onPromptAccepted();
            },
            closeSpotlightOnTrigger: false,
          }),
        },
      ];
    },
  } as const;
};
