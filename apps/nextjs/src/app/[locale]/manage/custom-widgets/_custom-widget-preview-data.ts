import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

interface PreviewSnapshot {
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; liveActions: boolean } | null;
}

export function createPreviewDisplayData({
  candidate,
  fixture,
  preview,
  options,
  fixtureError,
}: {
  candidate: HomarrCustomWidgetV2 | null;
  fixture: "live" | "loading" | "empty" | "error";
  preview: PreviewSnapshot;
  options: Record<string, unknown>;
  fixtureError: string;
}): Record<string, unknown> | null {
  if (!candidate) return null;
  const data =
    fixture === "empty" ? Object.fromEntries(candidate.requests.map((entry) => [entry.id, []])) : preview.data;
  const status =
    fixture === "loading"
      ? Object.fromEntries(candidate.requests.map((entry) => [entry.id, { loading: true }]))
      : fixture === "error"
        ? Object.fromEntries(
            candidate.requests.map((entry) => [entry.id, { loading: false, ok: false, error: fixtureError }]),
          )
        : preview.status;
  return {
    template: candidate.template,
    data,
    status,
    options,
    requestCapabilities: candidate.requests.map(
      ({ id, kind, method, trigger, minimumBoardPermission, confirmation, invalidates }) => ({
        id,
        kind,
        method,
        trigger,
        minimumBoardPermission,
        confirmation,
        invalidates,
      }),
    ),
    previewSessionId: preview.session?.id,
    previewLiveActions: preview.session?.liveActions ?? false,
    queriesDisabled: fixture !== "live",
    isEditMode: fixture !== "live",
  };
}
