import { timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { customWidgetStorage } from "@homarr/db/schema";

import { getBindingsDigest } from "./connections";
import { getPackageActionDigest } from "./permissions";
import { packageDigest } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";

export const webhookRecordSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  handler: z.string(),
  userId: z.string(),
  tokenHash: z.string(),
  authorizationDigest: z.string(),
  createdAt: z.string(),
});
export const webhookKey = (id: string) => `webhook:${id}`;
export const isWebhookStorage = (row: Pick<typeof customWidgetStorage.$inferSelect, "scope" | "key">) =>
  row.scope === "system" && row.key.startsWith("webhook:");

export async function getWebhookAuthorizationDigest(ctx: PackageContext, resolved: ResolvedPackagePlacement) {
  return packageDigest({
    behavior: getPackageActionDigest(resolved),
    connections: await getBindingsDigest(ctx, resolved.bindings),
    options: resolved.configuration,
  });
}

export async function getWebhookRecord(ctx: PackageContext, itemId: string, id: string) {
  const row = await ctx.db.query.customWidgetStorage.findFirst({
    where: and(
      eq(customWidgetStorage.ownerKey, itemId),
      eq(customWidgetStorage.scope, "system"),
      eq(customWidgetStorage.key, webhookKey(id)),
    ),
  });
  if (!row) return null;
  const record = webhookRecordSchema.safeParse(JSON.parse(row.value));
  if (!record.success || record.data.itemId !== itemId || record.data.id !== id) return null;
  return { row, record: record.data };
}

export function matchesWebhookToken(token: string, expected: string) {
  const actual = Buffer.from(packageDigest(token), "hex");
  const hash = Buffer.from(expected, "hex");
  return actual.length === hash.length && timingSafeEqual(actual, hash);
}
