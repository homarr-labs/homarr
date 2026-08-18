import { widgetKinds } from "@homarr/definitions";

const setupEntryPoints = new Set(["header", "spotlight", "board", "assistant", "docker", "management"]);
const setupIntents = new Set([
  ...widgetKinds,
  "widget",
  "app",
  "integration",
  "container",
  "board",
  "workshop",
  "customWidget",
  "add-compatible-widget",
]);
const setupOutcomes = new Set(["completed", "blocked", "continued"]);
const maximumSetupElapsedMs = 24 * 60 * 60 * 1_000;

const isValidSetupProperty = (key: string, value: unknown) => {
  if (key === "entryPoint") return typeof value === "string" && setupEntryPoints.has(value);
  if (key === "intent") return typeof value === "string" && setupIntents.has(value);
  if (key === "outcome") return typeof value === "string" && setupOutcomes.has(value);
  if (key === "elapsedMs") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximumSetupElapsedMs;
  }
  if (key === "hasBoardContext" || key === "canResolveInline") return typeof value === "boolean";
  return false;
};

export const getTrackedFeatureProperties = (
  feature: string,
  properties: Record<string, unknown> | undefined,
  userId: string,
) => {
  if (!feature.startsWith("setup:")) return { ...properties, userId };

  return Object.fromEntries(
    Object.entries(properties ?? {}).filter(([key, value]) => isValidSetupProperty(key, value)),
  );
};
