"use client";

import { useState } from "react";
import { Accordion, Button, Group, Modal, Stack, Text, TextInput, Textarea } from "@mantine/core";
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
  onPaste(response: string): string | null;
}

export function CustomWidgetAiCard(props: AiCardProps) {
  const t = useI18n("customWidget.workbench.ai");
  const [manualResponse, setManualResponse] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const response = await navigator.clipboard.readText();
      const error = props.onPaste(response);
      if (!error) return;
      setManualResponse(response);
      setManualError(error);
    } catch {
      setManualResponse("");
      setManualError(null);
    }
  };

  const submitManualResponse = () => {
    const error = props.onPaste(manualResponse ?? "");
    if (error) {
      setManualError(error);
      return;
    }
    setManualResponse(null);
    setManualError(null);
  };

  return (
    <>
      <Accordion variant="contained">
        <Accordion.Item value="ai">
          <Accordion.Control icon={<IconSparkles size={18} />}>{t("title")}</Accordion.Control>
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
              <Group gap="xs">
                <CopyAiPromptButton
                  getDraft={props.getDraft}
                  getDiagnostics={props.getDiagnostics}
                  request={props.request}
                  documentationUrl={props.documentationUrl}
                />
                <Button
                  type="button"
                  variant="light"
                  leftSection={<IconClipboard size={16} />}
                  onClick={() => void handlePaste()}
                >
                  {t("paste")}
                </Button>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <Modal opened={manualResponse !== null} onClose={() => setManualResponse(null)} title={t("response")} size="lg">
        <Stack gap="sm">
          <Text size="sm">{t("manualPasteDescription")}</Text>
          <Textarea
            label={t("response")}
            value={manualResponse ?? ""}
            onChange={(event) => {
              setManualResponse(event.currentTarget.value);
              setManualError(null);
            }}
            error={manualError ? t("invalidResponseDetail", { message: manualError }) : undefined}
            autosize
            minRows={8}
            maxRows={16}
          />
          <Button type="button" onClick={submitManualResponse}>
            {t("loadResponse")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
