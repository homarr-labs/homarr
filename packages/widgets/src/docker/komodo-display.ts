import type { KomodoResourceStatus } from "@homarr/integrations";

export const komodoStatusColors: Record<KomodoResourceStatus, string> = {
  healthy: "green",
  warning: "yellow",
  error: "red",
  unknown: "gray",
};

const komodoStateTranslationKeys = {
  ok: "ok",
  disabled: "disabled",
  notok: "notOk",
  not_ok: "notOk",
  running: "running",
  deploying: "deploying",
  paused: "paused",
  stopped: "stopped",
  created: "created",
  removing: "removing",
  down: "down",
  restarting: "restarting",
  dead: "dead",
  unhealthy: "unhealthy",
  stopping: "stopping",
  exited: "exited",
  not_deployed: "notDeployed",
  unknown: "unknown",
} as const;

export type KomodoStateTranslationKey = (typeof komodoStateTranslationKeys)[keyof typeof komodoStateTranslationKeys];

const KOMODO_SERVER_TABLE_MIN_WIDTH = 700;
const KOMODO_SUMMARY_WIDE_MIN_WIDTH = 720;
const KOMODO_SUMMARY_MEDIUM_MIN_WIDTH = 400;

export const usesKomodoServerTableLayout = (width: number) => width >= KOMODO_SERVER_TABLE_MIN_WIDTH;

export const getKomodoSummaryColumnCount = (width: number) => {
  if (width >= KOMODO_SUMMARY_WIDE_MIN_WIDTH) return 4;
  if (width >= KOMODO_SUMMARY_MEDIUM_MIN_WIDTH) return 2;
  return 1;
};

export const isContainerColumnVisible = (accessor: string, selectedColumns: ReadonlySet<string>, isKomodo: boolean) =>
  selectedColumns.has(accessor) && (!isKomodo || accessor !== "actions");

export const isContainerContextMenuEnabled = (isEditMode: boolean, isKomodo: boolean) => !isEditMode && !isKomodo;

export const getKomodoStateTranslationKey = (state: string): KomodoStateTranslationKey => {
  const normalizedState = state
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");

  return (
    (komodoStateTranslationKeys as Readonly<Record<string, KomodoStateTranslationKey>>)[normalizedState] ?? "unknown"
  );
};
