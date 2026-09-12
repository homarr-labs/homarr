import { z } from "zod/v4";

import { createId } from "@homarr/common";

export const workbenchPreconditionSchema = z.object({
  draftId: z.string().min(1).max(64),
  revision: z.number().int().nonnegative(),
});
export type WorkbenchPrecondition = z.infer<typeof workbenchPreconditionSchema>;
const draftIds = new WeakMap<object, string>();
export function getWorkbenchDraftId(store: object) {
  let id = draftIds.get(store);
  if (!id) {
    id = createId();
    draftIds.set(store, id);
  }
  return id;
}
export const workbenchPatchSchema = workbenchPreconditionSchema.extend({
  summary: z.string().min(1).max(400),
  changes: z
    .object({
      name: z.string().min(1).max(128).optional(),
      description: z.string().max(512).optional(),
      sources: z.string().max(100_000).optional().describe("Complete sources JSON. Never include credentials."),
      requests: z.string().max(200_000).optional().describe("Complete named requests JSON."),
      options: z.string().max(100_000).optional(),
      template: z.string().max(50_000).optional(),
      extensions: z.string().max(200_000).optional().describe("Advanced v3 extensions JSON; empty string uses v2."),
    })
    .strict(),
  templateEdits: z
    .array(
      z
        .object({
          from: z.number().int().min(0).max(50_000),
          to: z.number().int().min(0).max(50_000),
          expected: z.string().max(50_000),
          text: z.string().max(50_000),
        })
        .strict(),
    )
    .max(64)
    .optional()
    .describe(
      "Targeted JSX replacements with zero-based offsets and exact expected text. Preserve formatting outside these ranges. Do not combine with changes.template.",
    ),
  focus: z.string().max(160).optional(),
});
export type WorkbenchPatch = z.infer<typeof workbenchPatchSchema>;
export interface AssistantWorkbenchBridge {
  read(): unknown;
  apply(patch: WorkbenchPatch): unknown;
  preview(precondition: WorkbenchPrecondition): Promise<unknown>;
}
let active: AssistantWorkbenchBridge | null = null;
export const isAssistantWorkbenchOpen = () => active !== null;
export function registerAssistantWorkbench(bridge: AssistantWorkbenchBridge) {
  active = bridge;
  return () => {
    if (active === bridge) active = null;
  };
}
export const assistantWorkbenchExecutors = {
  workbench_read: async () => active?.read() ?? { success: false, error: "Open a Custom Widget workbench first." },
  workbench_patch: async (patch: WorkbenchPatch) =>
    active?.apply(patch) ?? { success: false, error: "The workbench is closed." },
  workbench_preview: async (precondition: WorkbenchPrecondition) =>
    active?.preview(precondition) ?? { success: false, error: "The workbench is closed." },
};

export function applyWorkbenchTemplateEdits(template: string, edits: NonNullable<WorkbenchPatch["templateEdits"]>) {
  let next = template;
  let boundary = template.length + 1;
  for (const edit of edits.toSorted((left, right) => right.from - left.from)) {
    if (
      edit.from > edit.to ||
      edit.to > template.length ||
      edit.to > boundary ||
      edit.from === boundary ||
      template.slice(edit.from, edit.to) !== edit.expected
    ) {
      throw new Error("Template edit is stale, overlapping, or outside the draft. Read the draft again.");
    }
    next = next.slice(0, edit.from) + edit.text + next.slice(edit.to);
    boundary = edit.from;
  }
  if (next.length > 50_000) throw new Error("The edited template exceeds the size limit.");
  return next;
}
