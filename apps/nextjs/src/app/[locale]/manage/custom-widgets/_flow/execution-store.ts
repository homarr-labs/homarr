import type { RouterOutputs } from "@homarr/api";
import type { CustomWidgetQueryExecution } from "@homarr/custom-widgets/runtime";
import type { PreviewState } from "./preview-state";

export type WorkbenchJournalEntry = RouterOutputs["customWidget"]["previewJournal"][number];
export interface NodeExecutionStatus {
  state: "idle" | "loading" | "success" | "error";
  error?: string;
  code?: number;
  durationMs?: number;
  timestamp?: number;
  simulated: boolean;
  stale: boolean;
}
export const EMPTY_JOURNAL: WorkbenchJournalEntry[] = [];
export const IDLE_EXECUTION: NodeExecutionStatus = { state: "idle", simulated: false, stale: false };
export interface WorkbenchQuerySnapshot {
  data: unknown;
  hasData: boolean;
  status: unknown;
}
export const EMPTY_EXECUTION_DATA = { data: {}, status: {} };

export function executionRequestIdentifier(requestId: string) {
  return requestId.replace(/^native:/u, "");
}

function compactStatus(
  value: unknown,
  entry: WorkbenchJournalEntry | undefined,
  preview: PreviewState,
  observed = false,
): NodeExecutionStatus {
  let raw: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) raw = value as Record<string, unknown>;
  let state: NodeExecutionStatus["state"] = "idle";
  if (value !== undefined || entry) state = "success";
  if (
    raw.ok === false ||
    raw.error ||
    (!observed && entry && !entry.simulated && (entry.status === null || entry.status >= 400))
  )
    state = "error";
  if (raw.loading || preview.outcome === "loading") state = "loading";
  let code = entry?.status ?? (typeof raw.status === "number" ? raw.status : undefined);
  if (observed) code = typeof raw.status === "number" ? raw.status : undefined;
  return {
    state,
    error: typeof raw.error === "string" ? raw.error.slice(0, 512) : undefined,
    code,
    durationMs: entry?.durationMs ?? (typeof raw.durationMs === "number" ? raw.durationMs : undefined),
    timestamp: entry?.timestamp,
    simulated: entry?.simulated ?? false,
    stale: preview.stale ?? false,
  };
}

export function createWorkbenchExecutionStore(initialPreview?: PreviewState) {
  let preview: PreviewState = initialPreview ?? { data: {}, status: {}, session: null, outcome: "idle" };
  let statuses = new Map<string, NodeExecutionStatus>();
  let journal = EMPTY_JOURNAL;
  const observedQueries = new Map<string, WorkbenchQuerySnapshot>();
  let queries = new Map<string, WorkbenchQuerySnapshot>();
  let dataSnapshot: { data: Record<string, unknown>; status: Record<string, unknown> } = EMPTY_EXECUTION_DATA;
  const subscribers = new Map<string, Set<() => void>>();
  const journalSubscribers = new Set<() => void>();
  const dataSubscribers = new Set<() => void>();
  const querySubscribers = new Map<string, Set<() => void>>();
  const updateQueries = () => {
    const ids = new Set([
      ...queries.keys(),
      ...Object.keys(preview.data),
      ...Object.keys(preview.status),
      ...observedQueries.keys(),
    ]);
    const next = new Map<string, WorkbenchQuerySnapshot>();
    const changed: string[] = [];
    for (const id of ids) {
      if (!observedQueries.has(id) && !Object.hasOwn(preview.data, id) && !Object.hasOwn(preview.status, id)) {
        changed.push(id);
        continue;
      }
      const value = observedQueries.get(id) ?? {
        data: preview.data[id],
        status: preview.status[id],
        hasData: Object.hasOwn(preview.data, id),
      };
      const previous = queries.get(id);
      if (
        previous &&
        previous.data === value.data &&
        previous.status === value.status &&
        previous.hasData === value.hasData
      )
        next.set(id, previous);
      else {
        next.set(id, value);
        changed.push(id);
      }
    }
    queries = next;
    if (!changed.length) return;
    dataSnapshot = { data: {}, status: {} };
    for (const [id, value] of queries) {
      if (value.hasData) dataSnapshot.data[id] = value.data;
      if (value.status !== undefined) dataSnapshot.status[id] = value.status;
    }
    for (const id of changed) querySubscribers.get(id)?.forEach((listener) => listener());
    dataSubscribers.forEach((listener) => listener());
  };
  const updateStatuses = () => {
    const latest = new Map<string, WorkbenchJournalEntry>();
    for (const entry of journal) {
      const id = executionRequestIdentifier(entry.requestId);
      if (!latest.has(id)) latest.set(id, entry);
    }
    const ids = new Set([...statuses.keys(), ...queries.keys(), ...latest.keys()]);
    const next = new Map<string, NodeExecutionStatus>();
    const changed: string[] = [];
    for (const id of ids) {
      const status = compactStatus(queries.get(id)?.status, latest.get(id), preview, observedQueries.has(id));
      const previous = statuses.get(id);
      if (previous && JSON.stringify(previous) === JSON.stringify(status)) next.set(id, previous);
      else {
        next.set(id, status);
        changed.push(id);
      }
    }
    statuses = next;
    for (const id of changed) subscribers.get(id)?.forEach((listener) => listener());
  };
  updateQueries();
  updateStatuses();
  return {
    getStatus: (id: string) => statuses.get(id) ?? IDLE_EXECUTION,
    getJournal: () => journal,
    getQuery: (id: string) => queries.get(id),
    getData: () => dataSnapshot,
    observeQuery(event: CustomWidgetQueryExecution) {
      if (!event.previewSessionId || event.previewSessionId !== preview.session?.id) return;
      const previous = queries.get(event.requestId);
      let value: WorkbenchQuerySnapshot;
      if (event.type === "result") {
        value = {
          data: event.result.data,
          hasData: true,
          status: {
            loading: false,
            ok: event.result.ok,
            status: event.result.status,
            statusText: event.result.statusText,
            error: event.result.error,
          },
        };
      } else {
        value = {
          data: previous?.data,
          hasData: previous?.hasData ?? false,
          status: { loading: false, ok: false, error: event.error },
        };
      }
      observedQueries.set(event.requestId, value);
      updateQueries();
      updateStatuses();
    },
    subscribeData(listener: () => void) {
      dataSubscribers.add(listener);
      return () => {
        dataSubscribers.delete(listener);
      };
    },
    subscribeQuery(id: string, listener: () => void) {
      const listeners = querySubscribers.get(id) ?? new Set<() => void>();
      querySubscribers.set(id, listeners);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) querySubscribers.delete(id);
      };
    },
    subscribe: (id: string, listener: () => void) => {
      const listeners = subscribers.get(id) ?? new Set<() => void>();
      subscribers.set(id, listeners);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) subscribers.delete(id);
      };
    },
    subscribeJournal: (listener: () => void) => {
      journalSubscribers.add(listener);
      return () => {
        journalSubscribers.delete(listener);
      };
    },
    update(nextPreview: PreviewState, entries: WorkbenchJournalEntry[]) {
      if (
        (nextPreview.session && nextPreview.session.id !== preview.session?.id) ||
        nextPreview.data !== preview.data ||
        nextPreview.status !== preview.status
      )
        observedQueries.clear();
      preview = nextPreview;
      const journalChanged = journal !== entries;
      journal = entries;
      updateQueries();
      updateStatuses();
      if (journalChanged) {
        journalSubscribers.forEach((listener) => listener());
      }
    },
  };
}
export type WorkbenchExecutionStore = ReturnType<typeof createWorkbenchExecutionStore>;
