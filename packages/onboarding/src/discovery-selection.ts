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

export const normalizeServiceUrl = (value: string) => {
  try {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed) ? trimmed : `http://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().replace(/\/$/u, "") : null;
  } catch {
    return null;
  }
};

export const isHttpUrl = (value: string) => normalizeServiceUrl(value) !== null;
