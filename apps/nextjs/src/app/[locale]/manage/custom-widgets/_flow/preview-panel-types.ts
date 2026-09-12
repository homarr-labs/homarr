import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { PreviewState } from "./preview-state";

export interface PreviewPanelProps {
  candidate: HomarrCustomWidgetV2 | null;
  validationIssues: Array<{ path?: string; message: string }>;
  preview: PreviewState;
  size: string;
  onSizeChange(value: string): void;
  optionsSnapshot: Record<string, unknown>;
  onOptionsChange(value: Record<string, unknown>): void;
  onLiveActionsChange(enabled: boolean): void;
}

export type PreviewFixture = "live" | "loading" | "empty" | "error";
