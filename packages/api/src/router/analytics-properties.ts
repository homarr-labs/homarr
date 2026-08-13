const setupPropertyKeys = new Set([
  "entryPoint",
  "intent",
  "outcome",
  "elapsedMs",
  "hasBoardContext",
  "canResolveInline",
]);

export const getTrackedFeatureProperties = (
  feature: string,
  properties: Record<string, unknown> | undefined,
  userId: string,
) => {
  if (!feature.startsWith("setup:")) return { ...properties, userId };

  return Object.fromEntries(
    Object.entries(properties ?? {}).filter(
      ([key, value]) => setupPropertyKeys.has(key) && ["string", "number", "boolean"].includes(typeof value),
    ),
  );
};
