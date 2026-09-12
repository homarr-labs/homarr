"use client";
import { createContext, useCallback, useContext, useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Badge, Tooltip } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { CustomWidgetExecutionObserverProvider } from "@homarr/custom-widgets/runtime";
import { useI18n } from "@homarr/translation/client";
import type { PreviewState } from "./preview-state";
import { createWorkbenchExecutionStore, EMPTY_JOURNAL, IDLE_EXECUTION } from "./execution-store";
import type { WorkbenchExecutionStore } from "./execution-store";

const ExecutionContext = createContext<WorkbenchExecutionStore | null>(null);
const noopSubscribe = () => () => undefined;
export function WorkbenchExecutionProvider({ preview, children }: { preview: PreviewState; children: ReactNode }) {
  const [store] = useState(() => createWorkbenchExecutionStore(preview));
  const journal = clientApi.customWidget.previewJournal.useQuery(
    { sessionId: preview.session?.id ?? "" },
    { enabled: !!preview.session, refetchInterval: preview.session ? 2_000 : false },
  );
  useLayoutEffect(() => store.update(preview, journal.data ?? EMPTY_JOURNAL), [store, preview, journal.data]);
  return (
    <CustomWidgetExecutionObserverProvider observer={store.observeQuery}>
      <ExecutionContext.Provider value={store}>{children}</ExecutionContext.Provider>
    </CustomWidgetExecutionObserverProvider>
  );
}
export function useWorkbenchQuery(id: string) {
  const store = useContext(ExecutionContext);
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribeQuery(id, listener) ?? (() => undefined),
    [store, id],
  );
  const snapshot = useCallback(() => store?.getQuery(id), [store, id]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
export function useWorkbenchQueryData() {
  const store = useContext(ExecutionContext);
  const snapshot = useCallback(() => store?.getData(), [store]);
  return useSyncExternalStore(store?.subscribeData ?? noopSubscribe, snapshot, snapshot);
}
export function useWorkbenchRequestStatus(id: string) {
  const store = useContext(ExecutionContext);
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(id, listener) ?? (() => undefined),
    [store, id],
  );
  const snapshot = useCallback(() => store?.getStatus(id) ?? IDLE_EXECUTION, [store, id]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
export function useWorkbenchJournal() {
  const store = useContext(ExecutionContext);
  const snapshot = useCallback(() => store?.getJournal() ?? EMPTY_JOURNAL, [store]);
  return useSyncExternalStore(store?.subscribeJournal ?? noopSubscribe, snapshot, snapshot);
}
const statusColors = { idle: "gray", loading: "yellow", success: "teal", error: "red" };
export function FlowExecutionStatus({ requestId }: { requestId: string }) {
  const t = useI18n("customWidget.flow");
  const status = useWorkbenchRequestStatus(requestId);
  let label = t(`execution.${status.state}`);
  if (status.simulated) label = t("execution.simulated");
  if (status.stale) label = t("execution.stale");
  let details = label;
  if (status.code !== undefined) details += ` · ${status.code}`;
  if (status.durationMs !== undefined) details += ` · ${Math.round(status.durationMs)} ms`;
  if (status.error) details += ` · ${status.error}`;
  return (
    <Tooltip label={details} multiline maw={300}>
      <Badge component="output" size="xs" variant="dot" color={statusColors[status.state]} aria-label={details}>
        {label}
      </Badge>
    </Tooltip>
  );
}
