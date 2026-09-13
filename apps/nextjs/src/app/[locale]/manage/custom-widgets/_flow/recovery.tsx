"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Button, Group, Switch } from "@mantine/core";
import { customWidgetEditorLayoutSchema } from "@homarr/custom-widgets/core";
import { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { buildDefinition } from "../_custom-widget-form-utils";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { withoutCredentials } from "./history";
import type { EditorSnapshot } from "./history";

type RecoveryDraft = Pick<EditorSnapshot, "content" | "layout">;
interface RecoveryState {
  key: string;
  enabled: boolean;
  recovered: RecoveryDraft | null;
}
interface RecoveryContextValue {
  enabled: boolean;
  available: boolean;
  setEnabled(value: boolean): void;
  restore(): void;
  discard(): void;
}
const RecoveryContext = createContext<RecoveryContextValue | null>(null);

/** One document observer serves the always-visible alert and contextual settings. */
export function DraftRecoveryProvider({
  form,
  definitionId,
  children,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
  children: ReactNode;
}) {
  const store = useCustomWidgetFormDocumentStore();
  const key = `homarr:custom-widget:draft:${definitionId ?? "new"}`;
  const [state, setState] = useState<RecoveryState>({ key: "", enabled: false, recovered: null });
  useEffect(() => {
    let enabled = false;
    let recovered: RecoveryDraft | null = null;
    try {
      enabled = localStorage.getItem("homarr:custom-widget:recovery-enabled") === "true";
      const raw = localStorage.getItem(key);
      if (raw && raw.length <= 1_000_000) {
        const saved = JSON.parse(raw) as EditorSnapshot;
        const values = customWidgetFormSchema.parse({ ...saved.content, secrets: [] });
        recovered = { content: withoutCredentials(values), layout: customWidgetEditorLayoutSchema.parse(saved.layout) };
      }
    } catch {
      /* Storage may be disabled or contain an obsolete draft. */
    }
    setState({ key, enabled, recovered });
  }, [key]);
  useEffect(() => {
    // Wait for this document's storage read before removing or replacing its draft.
    if (state.key !== key || !state.enabled || state.recovered) return;
    let timeout: ReturnType<typeof setTimeout>;
    const writeSnapshot = () => {
      try {
        if (!store.getDirty()) {
          localStorage.removeItem(key);
          return;
        }
        const content = withoutCredentials(store.getValues());
        // Validate credential-bearing fields even while the JSX draft has errors.
        if (!buildDefinition({ ...content, template: "<Text />", secrets: [] }).success) return;
        localStorage.setItem(key, JSON.stringify({ content, layout: store.getLayout() }));
      } catch {
        /* Recovery is optional; unavailable storage must not block editing. */
      }
    };
    const persist = () => {
      clearTimeout(timeout);
      timeout = setTimeout(writeSnapshot, 800);
    };
    const unsubscribe = store.subscribeEditor(persist);
    writeSnapshot();
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [state.enabled, state.key, state.recovered, key, store]);
  const value = useMemo<RecoveryContextValue>(
    () => ({
      enabled: state.key === key && state.enabled,
      available: state.key === key && state.recovered !== null,
      setEnabled(enabled) {
        setState((current) => ({ ...current, enabled }));
        try {
          localStorage.setItem("homarr:custom-widget:recovery-enabled", String(enabled));
          if (!enabled) localStorage.removeItem(key);
        } catch {
          /* Recovery remains optional when storage is unavailable. */
        }
      },
      restore() {
        if (state.key !== key || !state.recovered) return;
        const recovered = state.recovered;
        store.transaction(() => {
          form.setValues({ ...recovered.content, secrets: store.getValues().secrets });
          store.setLayout(recovered.layout);
        });
        setState((current) => ({ ...current, recovered: null }));
      },
      discard() {
        try {
          localStorage.removeItem(key);
        } catch {
          /* Recovery remains optional when storage is unavailable. */
        }
        setState((current) => ({ ...current, recovered: null }));
      },
    }),
    [form, key, state, store],
  );
  return <RecoveryContext.Provider value={value}>{children}</RecoveryContext.Provider>;
}

export function DraftRecoverySettings() {
  const recovery = useContext(RecoveryContext);
  const t = useI18n("customWidget.flow");
  if (!recovery) return null;
  return (
    <Switch
      size="xs"
      label={t("recovery")}
      checked={recovery.enabled}
      onChange={(event) => recovery.setEnabled(event.currentTarget.checked)}
    />
  );
}

export function DraftRecoveryAlert() {
  const recovery = useContext(RecoveryContext);
  const t = useI18n("customWidget.flow");
  if (!recovery?.available) return null;
  return (
    <Alert title={t("recoverTitle")} color="blue" role="alert">
      <Group>
        <Button size="xs" onClick={(event) => completeRecoveryAction(event.currentTarget, recovery.restore)}>
          {t("recover")}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={(event) => completeRecoveryAction(event.currentTarget, recovery.discard)}
        >
          {t("discardRecovery")}
        </Button>
      </Group>
    </Alert>
  );
}

function completeRecoveryAction(button: HTMLButtonElement, action: () => void) {
  const workbench = button.closest<HTMLElement>("[data-widget-workbench]");
  action();
  // The alert unmounts after either action; keep keyboard Undo in the workbench.
  workbench?.focus({ preventScroll: true });
}
