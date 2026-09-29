"use client";

import { useRef, useState } from "react";
import { Button, Modal, Stack, Text, Textarea } from "@mantine/core";
import { IconCopy, IconRobot } from "@tabler/icons-react";

import { buildCustomWidgetAiPrompt, buildCustomWidgetAssistantPrompt } from "@homarr/custom-widgets/authoring-prompt";
import type { CustomWidgetAiDiagnostic, CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";

interface CopyAiPromptButtonProps {
  rawResponse?: string | null;
  request?: string | null;
  documentationUrl?: string | null;
  getDraft: () => CustomWidgetAiDraft;
  getDiagnostics: () => readonly CustomWidgetAiDiagnostic[];
}

export const CopyAiPromptButton = ({
  rawResponse,
  getDraft,
  getDiagnostics,
  request,
  documentationUrl,
}: CopyAiPromptButtonProps) => {
  const t = useI18n("customWidget");
  const ai = useI18n("customWidget.workbench.ai");
  const assistant = useOptionalHomarrAssistant();
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const handleAssistant = () => {
    const prompt = buildCustomWidgetAssistantPrompt(
      undefined,
      rawResponse,
      getDraft(),
      request,
      documentationUrl,
      getDiagnostics(),
    );
    if (!assistant?.enabled || !assistant.sendPrompt(prompt)) return;
    showSuccessNotification({ title: t("action.aiPrompt"), message: t("notification.aiPromptSent") });
  };

  const handleCopy = async () => {
    const value = buildCustomWidgetAiPrompt(
      undefined,
      rawResponse,
      getDraft(),
      request,
      documentationUrl,
      getDiagnostics(),
    );
    try {
      await navigator.clipboard.writeText(value);
      showSuccessNotification({
        title: t("action.copyAiPrompt"),
        message: t("notification.aiPromptCopiedWithCount", { count: value.length }),
      });
    } catch {
      setManualPrompt(value);
    }
  };

  return (
    <>
      {assistant?.enabled && (
        <Button
          type="button"
          variant="light"
          leftSection={<IconRobot size={16} />}
          onClick={handleAssistant}
          disabled={!request?.trim()}
        >
          {t("action.aiPrompt")}
        </Button>
      )}
      <Button type="button" variant="light" leftSection={<IconCopy size={16} />} onClick={() => void handleCopy()}>
        {t("action.copyAiPrompt")}
      </Button>
      <Modal
        opened={manualPrompt !== null}
        onClose={() => setManualPrompt(null)}
        title={t("action.copyAiPrompt")}
        size="lg"
      >
        <Stack gap="sm">
          <Text size="sm">{ai("manualCopyDescription")}</Text>
          <Textarea
            ref={promptRef}
            label={t("action.copyAiPrompt")}
            value={manualPrompt ?? ""}
            readOnly
            autosize
            minRows={8}
            maxRows={16}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            type="button"
            onClick={() => {
              promptRef.current?.focus();
              promptRef.current?.select();
            }}
          >
            {ai("selectAll")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
};
