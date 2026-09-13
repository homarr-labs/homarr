import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

interface PreviewSnapshot {
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; liveActions: boolean } | null;
}

type PreviewCandidate = Pick<HomarrCustomWidgetV2, "requests" | "template" | "extensions">;

export function createPreviewDisplayData({
  candidate,
  fixture,
  preview,
  options,
  fixtureError,
}: {
  candidate: PreviewCandidate | null;
  fixture: "live" | "loading" | "empty" | "error";
  preview: PreviewSnapshot;
  options: Record<string, unknown>;
  fixtureError: string;
}): Record<string, unknown> | null {
  if (!candidate) return null;
  const requests = Object.entries(candidate.requests);
  const queryIds = [...requests.map(([id]) => id), ...Object.keys(candidate.extensions?.native ?? {})];
  const data =
    fixture === "empty" ? Object.fromEntries(queryIds.map((id) => [id, emptyFixture(preview.data[id])])) : preview.data;
  const status =
    fixture === "loading"
      ? Object.fromEntries(queryIds.map((id) => [id, { loading: true }]))
      : fixture === "error"
        ? Object.fromEntries(queryIds.map((id) => [id, { loading: false, ok: false, error: fixtureError }]))
        : preview.status;
  return {
    template: candidate.template,
    extensions: candidate.extensions,
    data,
    status,
    options,
    requestCapabilities: requests.map(([id, { kind, method, trigger, permission, confirmation, invalidates }]) => ({
      id,
      kind,
      method,
      trigger,
      minimumBoardPermission: permission,
      confirmation:
        typeof confirmation === "string" ? { title: "Confirm action", message: confirmation } : confirmation,
      invalidates,
    })),
    previewSessionId: preview.session?.id,
    previewLiveActions: preview.session?.liveActions ?? false,
    queriesDisabled: fixture !== "live",
    isEditMode: fixture !== "live",
  };
}

function emptyFixture(value: unknown, depth = 0): unknown {
  if (depth > 10 || Array.isArray(value) || value === undefined) return [];
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, emptyFixture(entry, depth + 1)]));
  return value;
}
