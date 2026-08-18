"use client";

import { Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useAssistantWidgetRenderer } from "./context";

export default function AssistantWidget(props: WidgetComponentProps<"assistant">) {
  const Renderer = useAssistantWidgetRenderer();
  const t = useScopedI18n("widget.assistant.unavailable");

  if (Renderer) return <Renderer {...props} />;

  return (
    <Center h="100%" p="md">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon variant="light" color="red" radius="xl" size="lg">
          <IconRobot size="var(--mantine-font-size-xl)" />
        </ThemeIcon>
        <Text size="sm" fw={600}>
          {t("title")}
        </Text>
        <Text size="xs" c="dimmed">
          {t("description")}
        </Text>
      </Stack>
    </Center>
  );
}
