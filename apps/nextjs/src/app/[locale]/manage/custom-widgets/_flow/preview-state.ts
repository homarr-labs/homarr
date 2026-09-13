import type { PreviewOutcome } from "../_custom-widget-preview-status";

export interface PreviewState {
  stale?: boolean;
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; expiresAt: number; liveActions: boolean } | null;
  outcome: PreviewOutcome;
}
