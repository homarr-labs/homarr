"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export function useHealthPreferences({
  boardId,
  itemId,
  setOptions,
  isEditMode,
}: WidgetComponentProps<"healthMonitoring">) {
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const t = useI18n("widget.healthMonitoring.rework");
  let canSave = false;
  if (board) canSave = constructBoardPermissions(board, session).hasChangeAccess;
  const { mutate: saveOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    scope: { id: `health-monitoring-options:${boardId ?? "preview"}:${itemId ?? "preview"}` },
    onError: () => showErrorNotification({ title: t("saveFailed"), message: t("saveFailedMessage") }),
  });

  return useCallback(
    (newOptions: Partial<WidgetComponentProps<"healthMonitoring">["options"]>) => {
      if (isEditMode) return;
      // Viewer preferences remain local; server writes use the same permission boundary as Downloads.
      setOptions({ newOptions });
      if (canSave && boardId && itemId) saveOptions({ boardId, itemId, newOptions });
    },
    [isEditMode, setOptions, canSave, boardId, itemId, saveOptions],
  );
}
