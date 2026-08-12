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

export const getKomodoStateTranslationKey = (state: string): KomodoStateTranslationKey => {
  const normalizedState = state
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");

  return (
    (komodoStateTranslationKeys as Readonly<Record<string, KomodoStateTranslationKey>>)[normalizedState] ?? "unknown"
  );
};
