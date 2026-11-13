import { createHash } from "node:crypto";

import { z } from "zod/v4";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

const workshopOriginSchema = z.object({
  submissionId: z.string().min(1).max(100),
  revision: z.number().int().positive(),
  installedHash: z.string().length(64),
  permissionsHash: z.string().length(64),
});

export function parseWorkshopOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return workshopOriginSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function getWorkshopContentHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function getWorkshopInstalledHash(widget: HomarrCustomWidgetV2) {
  const { name: _preservedName, ...content } = widget;
  return getWorkshopContentHash({
    ...content,
    sources: Object.fromEntries(
      Object.entries(widget.sources).map(([id, source]) => {
        if (source.type === "integration") {
          const { integrationId: _localBinding, ...manifest } = source;
          return [id, manifest];
        }
        const { baseUrl: _localBinding, ...manifest } = source;
        return [id, manifest];
      }),
    ),
  });
}

export function getWorkshopPermissionsHash(widget: HomarrCustomWidgetV2) {
  return getWorkshopContentHash({ sources: widget.sources, requests: widget.requests });
}

export function serializeWorkshopOrigin(
  submission: { id: string; revision: number },
  upstream: HomarrCustomWidgetV2,
  installed: HomarrCustomWidgetV2,
) {
  return JSON.stringify({
    submissionId: submission.id,
    revision: submission.revision,
    installedHash: getWorkshopInstalledHash(installed),
    permissionsHash: getWorkshopPermissionsHash(upstream),
  } satisfies z.infer<typeof workshopOriginSchema>);
}

/** Deployment bindings belong to this installation, never to a Workshop revision. */
export function preserveWorkshopSourceBindings(current: HomarrCustomWidgetV2, upstream: HomarrCustomWidgetV2) {
  return customWidgetDefinitionSchema.parse({
    ...upstream,
    name: current.name,
    sources: Object.fromEntries(
      Object.entries(upstream.sources).map(([id, source]) => {
        const previous = current.sources[id];
        if (!previous) return [id, source];
        if (source.type === "integration") {
          if (previous.type === "integration" && previous.integrationKind === source.integrationKind) {
            return [id, { ...source, integrationId: previous.integrationId }];
          }
          return [id, source];
        }
        if (previous.type !== "integration") return [id, { ...source, baseUrl: previous.baseUrl }];
        return [id, source];
      }),
    ),
  });
}
