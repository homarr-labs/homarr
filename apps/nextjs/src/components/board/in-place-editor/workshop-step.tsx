"use client";

import { useEffect, useState } from "react";
import { CancelledError } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { WorkshopWidgetReview } from "~/components/board/items/workshop-widget-review";
import { addInPlaceActions, getAddInPlaceState, useAddInPlaceSession } from "./store";

export const WorkshopStep = () => {
  const session = useAddInPlaceSession();
  const { data: authSession } = useSession();
  const board = useRequiredBoard();
  const utils = clientApi.useUtils();
  const t = useI18n();
  const [selection] = useState(session?.workshopSelection);

  useEffect(() => {
    if (!selection) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.target !== document.body) return;
      if (getAddInPlaceState().session?.workshopSelection?.attempt !== selection.attempt) return;
      event.preventDefault();
      addInPlaceActions.back();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selection]);

  if (!selection || !authSession?.user.permissions.includes("admin")) return null;

  const isCurrentSelection = () => {
    const current = getAddInPlaceState();
    return current.step === "workshop" && current.session?.workshopSelection?.attempt === selection.attempt;
  };

  const handleImported = async (definitionId: string) => {
    const input = { boardId: board.id };
    try {
      await utils.customWidget.available.cancel(input, { revert: false });
      await utils.customWidget.available.invalidate(input, { refetchType: "none" });
      const definitions = await utils.customWidget.available.fetch(input, { retry: false });
      if (!isCurrentSelection()) return;
      const installed = definitions.find(({ id }) => id === definitionId);
      if (!installed) throw new Error(t("item.create.notification.error.message"));
      addInPlaceActions.pick({
        type: "custom",
        id: installed.id,
        name: installed.name,
        defaultOptions: installed.defaultOptions,
        configurationVersion: installed.updatedAt.getTime(),
      });
    } catch (error) {
      if (!isCurrentSelection()) return;
      if (!(error instanceof CancelledError)) {
        showErrorNotification({
          title: t("common.error"),
          message: error instanceof Error ? error.message : String(error),
        });
      }
      addInPlaceActions.back();
    }
  };

  return (
    <WorkshopWidgetReview
      submissionId={selection.submissionId}
      onBack={() => addInPlaceActions.back()}
      onImported={(definitionId) => void handleImported(definitionId)}
    />
  );
};
