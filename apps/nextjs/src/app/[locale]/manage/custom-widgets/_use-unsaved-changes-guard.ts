"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { registerUnsavedChangesGuard } from "./_unsaved-changes-guard";

export function useUnsavedChangesGuard(isDirty: boolean) {
  const tConfirmLeave = useI18n("board.action.edit.confirmLeave");
  const tCommon = useI18n("common");
  const router = useRouter();
  const { openConfirmModal } = useConfirmModal();
  const dirtyRef = useRef(isDirty);
  const confirmNavigationRef = useRef<(href: string) => void>(() => undefined);
  dirtyRef.current = isDirty;
  confirmNavigationRef.current = (href) => {
    openConfirmModal({
      title: tConfirmLeave("title"),
      children: tConfirmLeave("message"),
      confirmProps: { children: tCommon("action.discard") },
      onConfirm: () => router.push(href),
    });
  };

  useEffect(
    () =>
      registerUnsavedChangesGuard({
        isDirty: () => dirtyRef.current,
        confirmNavigation: (href) => confirmNavigationRef.current(href),
      }),
    [],
  );
}
