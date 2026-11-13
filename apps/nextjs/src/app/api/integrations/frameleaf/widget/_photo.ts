import { z } from "zod/v4";

import { requireFrameleafWidgetAsync } from "@homarr/api/frameleaf";
import { createKeyedFingerprint } from "@homarr/common/server";
import { db } from "@homarr/db";
import { FrameleafConnectionError, FrameleafDatabaseStore, FrameleafReader } from "@homarr/integrations/frameleaf";

import { requireFrameleafSessionAsync } from "../_access";

export const frameleafPhotoQuery = z.object({
  itemId: z.string().min(1).max(128),
  page: z.coerce.number().int().min(1).max(10000000).default(1),
});
export async function loadFrameleafPhotoAsync(input: z.infer<typeof frameleafPhotoQuery>) {
  const { session } = await requireFrameleafSessionAsync();
  const context = await requireFrameleafWidgetAsync(db, session, input.itemId);
  const reader = new FrameleafReader(new FrameleafDatabaseStore(db, context.integrationId));
  const result = await reader.pageAsync(context.albumId, input.page);
  const current = await requireFrameleafSessionAsync();
  const checked = await requireFrameleafWidgetAsync(db, current.session, input.itemId);
  if (JSON.stringify(checked) !== JSON.stringify(context)) throw new FrameleafConnectionError("consent");
  const asset = result.items[0] ?? null;
  const binding = asset
    ? createKeyedFingerprint(
        JSON.stringify([input.itemId, context, result.grantId, result.policyRevision, asset.id, asset.updatedAt]),
      )
    : null;
  return { context, reader, total: result.total, asset, binding };
}
