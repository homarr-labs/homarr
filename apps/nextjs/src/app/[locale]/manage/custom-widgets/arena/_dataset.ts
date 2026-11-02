import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod/v4";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import { authorizeArena } from "./_authorize";
import type { BlindDataset } from "./_review";
import privatePack from "./_generated/pack.json";

const record = z.record(z.string(), z.unknown());
const params = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const caseSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  responses: record,
  emptyResponses: record,
  manualParams: z.record(z.string(), params),
  defaultOptions: params,
  simulation: z.object({ clock: z.string(), refreshSeconds: z.number().nullable(), note: z.string() }),
});
const packSchema = z.object({
  datasetHash: z.string().min(1),
  experiment: z.object({
    cases: z.array(caseSchema).length(12),
    candidates: z
      .array(
        z.object({
          id: z.string(),
          caseId: z.string(),
          definition: customWidgetDefinitionSchema.nullable(),
          status: z.enum(["ready", "pending", "invalid"]),
        }),
      )
      .length(60),
    matches: z
      .array(z.object({ id: z.string(), caseId: z.string(), leftId: z.string(), rightId: z.string() }))
      .length(120),
  }),
  conditions: z.array(z.object({ id: z.string(), name: z.string(), prompt: z.string(), sha256: z.string() })),
  candidateConditions: z.record(z.string(), z.string()),
});

export async function readArenaDataset() {
  const userId = await authorizeArena();
  const pack = packSchema.parse(privatePack);
  const dataset: BlindDataset = {
    hash: pack.datasetHash,
    reviewer: createHash("sha256").update(`arena-reviewer:${userId}`).digest("hex"),
    cases: pack.experiment.cases,
    candidates: pack.experiment.candidates.map(({ id, caseId, status, definition }) => {
      let safeDefinition = null;
      if (status === "ready" && definition)
        safeDefinition = { template: definition.template, requests: definition.requests };
      return { id, caseId, status, definition: safeDefinition };
    }),
    matches: pack.experiment.matches,
  };
  const ids = new Set(dataset.candidates.map(({ id }) => id));
  if (ids.size !== 60 || new Set(dataset.matches.map(({ id }) => id)).size !== 120)
    throw new Error("Arena schedule unavailable");
  for (const match of dataset.matches) {
    const left = dataset.candidates.find(({ id }) => id === match.leftId);
    const right = dataset.candidates.find(({ id }) => id === match.rightId);
    if (!left || !right || left.id === right.id || left.caseId !== match.caseId || right.caseId !== match.caseId)
      throw new Error("Arena schedule unavailable");
  }
  return { dataset, pack };
}
