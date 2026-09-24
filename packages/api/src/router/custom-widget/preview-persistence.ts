import { TRPCError } from "@trpc/server";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import type { CustomWidgetPreviewJournalEntry, CustomWidgetPreviewSession } from "./preview-sessions";

type PreviewPersistenceAction = "creating" | "updating";

export function parsePreviewDefinition(session: CustomWidgetPreviewSession): HomarrCustomWidgetV2 {
  return parseCustomWidgetAuthoringInput(() =>
    customWidgetDefinitionSchema.parse({
      $schema: "homarr-custom-widget-v2",
      name: session.name,
      description: session.description,
      iconUrl: session.iconUrl,
      sources: session.sources,
      requests: session.requests,
      options: session.optionDefinitions,
      template: session.template,
    }),
  );
}

export function assertCurrentPreviewEvidence(
  session: CustomWidgetPreviewSession,
  evidence: readonly CustomWidgetPreviewJournalEntry[],
  action: PreviewPersistenceAction,
) {
  const unverifiedQueryIds = getUnverifiedRequestIds(session, evidence, "query");
  if (unverifiedQueryIds.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Test every final preview query successfully before ${action} the widget: ${unverifiedQueryIds.join(", ")}`,
    });
  }

  const unverifiedActionIds = getUnverifiedRequestIds(session, evidence, "action");
  if (unverifiedActionIds.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Test every final preview action before ${action} the widget: ${unverifiedActionIds.join(", ")}`,
    });
  }
}

function getUnverifiedRequestIds(
  session: CustomWidgetPreviewSession,
  evidence: readonly CustomWidgetPreviewJournalEntry[],
  kind: CustomJsxRequest["kind"],
) {
  return Object.entries(session.requests).flatMap(([requestId, request]) => {
    if (request.kind !== kind) return [];
    const verified = evidence.some((entry) => {
      if (entry.kind !== kind || entry.requestId !== requestId || entry.sessionRevision !== session.revision) {
        return false;
      }
      if (kind === "action" && entry.simulated) return true;
      return entry.status !== null && entry.status >= 200 && entry.status < 300;
    });
    return verified ? [] : [requestId];
  });
}
