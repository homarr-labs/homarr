import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

interface PreviewSnapshot {
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; liveActions: boolean } | null;
}

type PreviewCandidate = Pick<HomarrCustomWidgetV2, "requests" | "template">;

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
  const data = fixture === "empty" ? Object.fromEntries(requests.map(([id]) => [id, []])) : preview.data;
  const status =
    fixture === "loading"
      ? Object.fromEntries(requests.map(([id]) => [id, { loading: true }]))
      : fixture === "error"
        ? Object.fromEntries(requests.map(([id]) => [id, { loading: false, ok: false, error: fixtureError }]))
        : preview.status;
  return {
    template: candidate.template,
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
