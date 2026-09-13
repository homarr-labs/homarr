"use client";
import { useEffect, useState } from "react";
import { Alert, Stack, Text } from "@mantine/core";
import { useAuiState } from "@assistant-ui/react";
import { useI18n } from "@homarr/translation/client";

import { useOptionalHomarrAssistant, useAssistantPreferences } from "~/components/assistant/assistant-context";
import { AssistantConversationSurface } from "~/components/assistant/assistant-panel";
import { AssistantComposerSurfaceBoundary } from "~/components/assistant/assistant-runtime-provider";
import { getPendingAssistantAction } from "~/components/assistant/assistant-pending-action";
import {
  applyWorkbenchTemplateEdits,
  getWorkbenchDraftId,
  registerAssistantWorkbench,
} from "~/components/assistant/assistant-workbench-bridge";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { buildDefinition } from "../_custom-widget-form-utils";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { withoutCredentials } from "./history";

export function WorkbenchAssistant({
  form,
  selected,
  onSelect,
  onPreview,
}: {
  form: CustomWidgetWorkbenchForm;
  selected: string;
  onSelect(id: string): void;
  onPreview(): Promise<unknown>;
}) {
  const store = useCustomWidgetFormDocumentStore();
  const draftId = getWorkbenchDraftId(store);
  const t = useI18n("customWidget.flow");
  const assistant = useOptionalHomarrAssistant();
  const [result, setResult] = useState("");
  useEffect(
    () =>
      registerAssistantWorkbench({
        read: () => {
          const draft = buildDefinition(store.getValues());
          if (!draft.success)
            return {
              success: false,
              draftId,
              revision: store.getRevision(),
              selected,
              fields: withoutCredentials(store.getValues()),
              diagnostics: draft.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
            };
          return { success: true, draftId, revision: store.getRevision(), selected, definition: draft.data };
        },
        apply: (patch) => {
          if (patch.draftId !== draftId || patch.revision !== store.getRevision())
            return { success: false, error: "Draft changed. Read it again before applying changes." };
          const next = { ...withoutCredentials(store.getValues()), ...patch.changes };
          if (patch.templateEdits?.length) {
            if (patch.changes.template !== undefined)
              return { success: false, error: "Choose targeted edits or a complete template, not both." };
            try {
              next.template = applyWorkbenchTemplateEdits(next.template, patch.templateEdits);
            } catch (error) {
              return { success: false, error: error instanceof Error ? error.message : "Invalid template edit" };
            }
          }
          const parsed = buildDefinition({ ...next, secrets: [] });
          if (!parsed.success)
            return {
              success: false,
              diagnostics: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
            };
          store.transaction(() => form.setValues({ ...next, secrets: store.getValues().secrets }));
          setResult(patch.summary);
          if (patch.focus) onSelect(patch.focus);
          return { success: true, draftId, revision: store.getRevision(), summary: patch.summary };
        },
        preview: async (precondition) => {
          if (precondition.draftId !== draftId || precondition.revision !== store.getRevision())
            return { success: false, error: "Draft changed. Read it again before running queries." };
          return onPreview();
        },
      }),
    [draftId, form, onPreview, onSelect, selected, store],
  );
  return (
    <Stack gap="sm">
      {result && (
        <Alert color="teal" aria-live="polite">
          {result}
        </Alert>
      )}
      {!assistant?.enabled && (
        <Text size="xs" c="dimmed">
          {assistant?.unavailableDescription ?? t("assistantUnavailable")}
        </Text>
      )}
      {assistant?.enabled && (
        <AssistantComposerSurfaceBoundary surfaceId="custom-widget-workbench">
          <Conversation />
        </AssistantComposerSurfaceBoundary>
      )}
    </Stack>
  );
}
function Conversation() {
  const assistant = useOptionalHomarrAssistant();
  const preferences = useAssistantPreferences();
  const messages = useAuiState((state) => state.thread.messages);
  const last = messages.findLast((message) => message.role === "assistant");
  if (!assistant) return null;
  return (
    <div style={{ height: 580, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <AssistantConversationSurface
        isRunning={assistant.isRunning}
        pendingAction={getPendingAssistantAction(last)}
        modelId={preferences.modelId}
        models={preferences.models}
        modelOptionsLoading={preferences.isLoading}
        reasoning={preferences.reasoning}
        isRefreshing={assistant.isRefreshing}
        onRefresh={assistant.refreshCurrentView}
        onModelChange={preferences.setModelId}
        onReasoningChange={preferences.setReasoning}
      />
    </div>
  );
}
