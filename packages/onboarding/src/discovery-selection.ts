export const takeNewSourceIds = (sourceIds: string[], seenSourceIds: Set<string>) =>
  sourceIds.filter((sourceId) => {
    if (seenSourceIds.has(sourceId)) return false;
    seenSourceIds.add(sourceId);
    return true;
  });

export const resolveDiscoveredAppUrl = (
  override: string | undefined,
  suggestedUrl: string | null,
  generatedUrl: string | null,
) => override ?? suggestedUrl ?? generatedUrl ?? "";

export const isHttpUrl = (value: string) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};
