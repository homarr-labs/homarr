"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconRestore } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { isRecord } from "@homarr/common";
import { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";

import { getCustomWidgetRecoveryContent } from "./_custom-widget-document-history";
import type { CustomWidgetDocumentContent } from "./_custom-widget-document-history";
import { useCustomWidgetFormDocumentStore } from "./_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

interface RecoveryDraft {
  definitionId: string | null;
  content: CustomWidgetDocumentContent;
}

const MAX_RECOVERY_CHARACTERS = 1_000_000;

export function CustomWidgetDraftControls({
  form,
  definitionId,
  disabled,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
  disabled: boolean;
}) {
  const t = useI18n("customWidget.workbench.history");
  const store = useCustomWidgetFormDocumentStore();
  const history = useSyncExternalStore(store.subscribe, store.getHistory, store.getHistory);
  const dirty = useSyncExternalStore(store.subscribe, store.getDirty, store.getDirty);
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [recovery, setRecovery] = useState<RecoveryDraft | null>(null);
  const storageKey = userId ? `homarr:custom-widget-recovery:${userId}` : null;

  const restoreHistory = useCallback(
    (direction: "undo" | "redo") => {
      if (disabled) return;
      const restored = store[direction]();
      if (restored) form.setValues(restored);
    },
    [disabled, form, store],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-custom-widget-workbench]")) return;
      if (target.closest("[data-custom-widget-secret], [data-custom-widget-local-history], #preview")) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) restoreHistory("redo");
      else restoreHistory("undo");
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [restoreHistory]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved || saved.length > MAX_RECOVERY_CHARACTERS) return;
      const parsed = JSON.parse(saved) as RecoveryDraft;
      if (!parsed || parsed.definitionId !== (definitionId ?? null)) return;
      if (!isRecord(parsed.content)) return;
      const keys = customWidgetFormSchema.keyof().options.filter((key) => key !== "secrets");
      if (!keys.every((key) => typeof parsed.content[key] === "string")) return;
      setRecovery({
        definitionId: parsed.definitionId,
        content: getCustomWidgetRecoveryContent({ ...parsed.content, secrets: [] }),
      });
    } catch {
      // Browser storage is optional; editing and saving continue without it.
    }
  }, [definitionId, storageKey]);

  useEffect(() => {
    if (!storageKey || recovery) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      clearTimeout(timeout);
      if (!store.getDirty()) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && (JSON.parse(saved) as RecoveryDraft).definitionId === (definitionId ?? null)) {
            localStorage.removeItem(storageKey);
          }
        } catch {
          /* Storage is optional. */
        }
        return;
      }
      timeout = setTimeout(() => {
        try {
          const draft = JSON.stringify({
            definitionId: definitionId ?? null,
            content: getCustomWidgetRecoveryContent(store.getValues()),
          } satisfies RecoveryDraft);
          if (draft.length <= MAX_RECOVERY_CHARACTERS) localStorage.setItem(storageKey, draft);
        } catch {
          // Quota limits and blocked storage must not interrupt the workbench.
        }
      }, 500);
    };
    const unsubscribe = store.subscribe(persist);
    if (store.getDirty()) persist();
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [definitionId, recovery, storageKey, store]);

  const dismissRecovery = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Storage is optional. */
      }
    }
    setRecovery(null);
  };

  return (
    <Stack gap="sm" mb="md">
      {recovery && (
        <Alert title={t("recoveryTitle")}>
          <Stack gap="xs">
            <Text size="sm">{t("recoveryDescription")}</Text>
            <Group gap="xs">
              <Button
                size="xs"
                type="button"
                disabled={disabled}
                onClick={() => {
                  form.setValues({ ...store.getValues(), ...recovery.content, secrets: [] });
                  dismissRecovery();
                }}
              >
                {t("restore")}
              </Button>
              <Button size="xs" type="button" variant="subtle" onClick={dismissRecovery}>
                {t("discard")}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
      <Group gap="xs">
        <Button
          type="button"
          size="compact-sm"
          variant="subtle"
          leftSection={<IconArrowBackUp size={16} />}
          disabled={disabled || !history.canUndo}
          onClick={() => restoreHistory("undo")}
          aria-keyshortcuts="Control+Z Meta+Z"
        >
          {t("undo")}
        </Button>
        <Button
          type="button"
          size="compact-sm"
          variant="subtle"
          leftSection={<IconArrowForwardUp size={16} />}
          disabled={disabled || !history.canRedo}
          onClick={() => restoreHistory("redo")}
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
        >
          {t("redo")}
        </Button>
        <Button
          type="button"
          size="compact-sm"
          variant="subtle"
          leftSection={<IconRestore size={16} />}
          disabled={disabled || !dirty}
          onClick={() => form.setValues(store.resetToSaved())}
        >
          {t("reset")}
        </Button>
        <Text size="xs" c="dimmed">
          {t("credentialsExcluded")}
        </Text>
      </Group>
    </Stack>
  );
}
