"use client";

import { Accordion, Button, Group, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { IconClipboard, IconSparkles } from "@tabler/icons-react";

import type { CustomWidgetAiDiagnostic, CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { useI18n } from "@homarr/translation/client";

import { CopyAiPromptButton } from "./_copy-ai-prompt-button";

interface AiCardProps {
  getDraft(): CustomWidgetAiDraft;
  getDiagnostics(): readonly CustomWidgetAiDiagnostic[];
  request: string;
  onRequestChange(value: string): void;
  documentationUrl: string;
  onDocumentationUrlChange(value: string): void;
  onPaste(): void;
}

export function CustomWidgetAiCard(props: AiCardProps) {
  const t = useI18n("customWidget.workbench.ai");
  return (
    <Accordion variant="contained">
      <Accordion.Item value="ai">
        <Group gap={0} wrap="nowrap">
          <Accordion.Control icon={<IconSparkles size={18} />} style={{ flex: 1 }}>
            {t("title")}
          </Accordion.Control>
          <CopyAiPromptButton
            getDraft={props.getDraft}
            getDiagnostics={props.getDiagnostics}
            request={props.request}
            documentationUrl={props.documentationUrl}
          />
        </Group>
        <Accordion.Panel>
          <Stack gap="sm">
            <Text size="sm" c="light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))">
              {t("description")}
            </Text>
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
            <Button type="button" variant="light" leftSection={<IconClipboard size={16} />} onClick={props.onPaste}>
              {t("paste")}
            </Button>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
