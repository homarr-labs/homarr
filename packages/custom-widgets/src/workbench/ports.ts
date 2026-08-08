import type { CustomWidgetFormValues } from "./form-schema";

export interface WorkbenchPreviewResult {
  success: boolean;
  data?: unknown;
  rawResponse?: string | null;
  error?: string;
  sessionId?: string;
}

export interface WorkbenchJournalEntry {
  requestId: string;
  method: string;
  status: number | null;
  durationMs: number;
  simulated: boolean;
}

export interface CustomWidgetWorkbenchPort {
  preview(values: CustomWidgetFormValues, signal?: AbortSignal): Promise<WorkbenchPreviewResult>;
  queryPreview(
    input: { sessionId: string; requestId: string; params: Record<string, string | number | boolean> },
    signal?: AbortSignal,
  ): Promise<unknown>;
  simulateAction(input: {
    sessionId: string;
    requestId: string;
    params: Record<string, string | number | boolean>;
  }): Promise<unknown>;
  setLiveActions(input: { sessionId: string; enabled: boolean }): Promise<void>;
  readJournal(sessionId: string, signal?: AbortSignal): Promise<readonly WorkbenchJournalEntry[]>;
}
