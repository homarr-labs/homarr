"use client";

import { Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";

export interface AssistantUnavailableViewProps {
  title: string;
  description: string;
}

export function AssistantUnavailableView({ title, description }: AssistantUnavailableViewProps) {
  return (
    <Center h="100%" p="md">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon variant="light" radius="xl" size="lg">
          <IconRobot size="var(--mantine-font-size-xl)" />
        </ThemeIcon>
        <Text size="sm" fw={600}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Center>
  );
}
