export function getDependentRequestIds(requestsJson: string, sourceId: string) {
  const requests = parseRequestRecord(requestsJson);
  return Object.entries(requests).flatMap(([requestId, request]) =>
    isRecord(request) && request.source === sourceId ? [requestId] : [],
  );
}

export function removeDependentRequests(requestsJson: string, sourceId: string) {
  return Object.fromEntries(
    Object.entries(parseRequestRecord(requestsJson)).filter(
      ([, request]) => !isRecord(request) || request.source !== sourceId,
    ),
  );
}

function parseRequestRecord(requestsJson: string): Record<string, unknown> {
  try {
    const requests = JSON.parse(requestsJson) as unknown;
    return isRecord(requests) ? requests : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
