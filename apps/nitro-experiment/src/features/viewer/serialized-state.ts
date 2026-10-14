import { z } from "zod";

import { boardSnapshotSchema } from "../../contracts/schemas";

export const serializedRouterStateSchema = z.strictObject({
  matches: z
    .array(
      z.strictObject({
        i: z.string(),
        u: z.number().finite(),
        s: z.literal("success"),
        b: z.json().optional(),
        l: boardSnapshotSchema.optional(),
        ssr: z.union([z.boolean(), z.literal("data-only")]).optional(),
      }),
    )
    .length(2),
  lastMatchId: z.string(),
  dehydratedData: z.strictObject({ queryState: z.json() }),
});

export type SerializedRouterState = z.infer<typeof serializedRouterStateSchema>;

export function normalizeJson(value: unknown): z.infer<ReturnType<typeof z.json>> {
  return z.json().parse(JSON.parse(JSON.stringify(value)));
}
