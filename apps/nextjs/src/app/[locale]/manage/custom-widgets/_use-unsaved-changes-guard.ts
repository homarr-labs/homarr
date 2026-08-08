"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { registerUnsavedChangesGuard } from "./_unsaved-changes-guard";

export function useUnsavedChangesGuard(isDirty: boolean) {
  const t = useI18n();
  const router = useRouter();
  const { openConfirmModal } = useConfirmModal();
  const dirtyRef = useRef(isDirty);
  const confirmNavigationRef = useRef<(href: string) => void>(() => undefined);
  dirtyRef.current = isDirty;
  confirmNavigationRef.current = (href) => {
    openConfirmModal({
      title: t("board.action.edit.confirmLeave.title"),
      children: t("board.action.edit.confirmLeave.message"),
      confirmProps: { children: t("common.action.discard") },
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
