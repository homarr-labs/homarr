import { useRef } from "react";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { PreviewPanelProps } from "./preview-panel-types";

/** Keep session mode updates alive when the preview tools close. */
export function usePreviewLiveActions({ preview, onLiveActionsChange }: PreviewPanelProps) {
  const t = useI18n("customWidget.workbench.preview");
  const mutation = clientApi.customWidget.setPreviewLiveActions.useMutation();
  const current = useRef({ sessionId: preview.session?.id, onLiveActionsChange });
  current.current = { sessionId: preview.session?.id, onLiveActionsChange };
  const pending = useRef(false);
  const toggle = (enabled: boolean) => {
    const sessionId = current.current.sessionId;
    if (!sessionId || pending.current) return;
    pending.current = true;
    mutation.mutate(
      { sessionId, enabled },
      {
        onSuccess: () => {
          if (current.current.sessionId === sessionId) current.current.onLiveActionsChange(enabled);
        },
        onError: (error) => {
          if (current.current.sessionId !== sessionId) return;
          showErrorNotification({ title: t("liveActions"), message: error.message });
        },
        onSettled: () => {
          pending.current = false;
        },
      },
    );
  };
  return { pending: mutation.isPending, toggle };
}
