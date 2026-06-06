"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import type { FlowGraph } from "@homarr/custom-widget-nodes";
import { FlowEditor } from "@homarr/custom-widget-nodes/editor";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface FlowEditorClientProps {
  definitionId: string;
  initialGraph: FlowGraph | undefined;
}

export function FlowEditorClient({ definitionId, initialGraph }: FlowEditorClientProps) {
  const t = useScopedI18n("customWidget");
  const updateMutation = clientApi.customWidget.update.useMutation();
  const utils = clientApi.useUtils();

  const handleSave = useCallback(
    async (graph: FlowGraph) => {
      try {
        await updateMutation.mutateAsync({
          id: definitionId,
          flowGraph: JSON.stringify(graph),
        });
        await utils.customWidget.byId.invalidate({ id: definitionId });
        showSuccessNotification({ title: t("action.save"), message: t("notification.flowSaved") });
      } catch {
        showErrorNotification({ title: t("action.save"), message: t("notification.flowSaveError") });
      }
    },
    [definitionId, updateMutation, utils, t],
  );

  return <FlowEditor initialGraph={initialGraph} onSave={handleSave} isSaving={updateMutation.isPending} />;
}
