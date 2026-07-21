"use client";

import { Button, Card, Group, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useScopedI18n } from "@homarr/translation/client";

import { CopyAiPromptButton } from "./_copy-ai-prompt-button";

interface AiCardProps {
  candidate: HomarrCustomWidgetV2 | null;
  request: string;
  onRequestChange(value: string): void;
  documentationUrl: string;
  onDocumentationUrlChange(value: string): void;
  onPaste(): void;
}

export function CustomWidgetAiCard(props: AiCardProps) {
  const t = useScopedI18n("customWidget.workbench.ai");
  return (
    <Card withBorder p="md">
      <Stack gap="sm">
        <Group gap="xs">
          <IconSparkles size={18} />
          <Text fw={600}>{t("title")}</Text>
        </Group>
        <Textarea
          label={t("request")}
          value={props.request}
          onChange={(event) => props.onRequestChange(event.currentTarget.value)}
          autosize
          minRows={2}
        />
        <TextInput
          label={t("documentationUrl")}
          value={props.documentationUrl}
          onChange={(event) => props.onDocumentationUrlChange(event.currentTarget.value)}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <CopyAiPromptButton
            currentConfig={props.candidate}
            request={props.request}
            documentationUrl={props.documentationUrl}
          />
          <Button type="button" variant="light" leftSection={<IconSparkles size={16} />} onClick={props.onPaste}>
            {t("paste")}
          </Button>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
