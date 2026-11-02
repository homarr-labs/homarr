import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

export const ARENA_CLOCK = "2026-11-02T12:00:00Z";
export const ARENA_VIEWPORTS = [
  { id: "wide", width: 640, height: 480 },
  { id: "narrow", width: 360, height: 640 },
] as const;
export const ARENA_STATES = ["success", "loading", "error", "empty"] as const;
export type ArenaState = (typeof ARENA_STATES)[number];
export type ArenaViewport = (typeof ARENA_VIEWPORTS)[number]["id"];

export interface ArenaCase {
  id: string;
  title: string;
  prompt: string;
  definition: HomarrCustomWidgetV2;
  responses: Record<string, unknown>;
  emptyResponses: Record<string, unknown>;
  manualParams: Record<string, Record<string, string | number | boolean>>;
  defaultOptions: Record<string, string | number | boolean>;
  simulation: { clock: string; refreshSeconds: number | null; note: string };
}

export interface ArenaCandidate {
  id: string;
  caseId: string;
  definition: HomarrCustomWidgetV2 | null;
  status: "ready" | "invalid" | "pending";
  issues: string[];
}

export interface ArenaMatch {
  id: string;
  caseId: string;
  leftId: string;
  rightId: string;
}

export interface ArenaExperiment {
  id: string;
  version: number;
  cases: ArenaCase[];
  candidates: ArenaCandidate[];
  matches: ArenaMatch[];
  clock: string;
  viewports: typeof ARENA_VIEWPORTS;
  states: typeof ARENA_STATES;
  provenance: string;
}

export interface ArenaCondition {
  id: string;
  name: string;
  prompt: string;
  sha256: string;
}

export interface ArenaPrivatePack {
  datasetHash: string;
  experiment: ArenaExperiment;
  conditions: ArenaCondition[];
  candidateConditions: Record<string, string>;
}
