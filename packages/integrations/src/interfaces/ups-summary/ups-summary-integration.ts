import type { UpsSummary } from "./ups-summary-types";

export interface IUpsSummaryIntegration {
  getUpsSummariesAsync(): Promise<UpsSummary[]>;
}
