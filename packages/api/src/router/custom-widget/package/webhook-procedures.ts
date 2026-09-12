import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { and, eq } from "@homarr/db";
import { customWidgetStorage } from "@homarr/db/schema";

import { widgetPackageAdminProcedure as admin } from "./procedure";
import { packageDigest, resolvePackagePlacement } from "./records";
import { withWidgetInstallationLock } from "./coordination";
import {
  getWebhookAuthorizationDigest,
  getWebhookRecord,
  isWebhookStorage,
  webhookKey,
  webhookRecordSchema,
} from "./webhook-records";

const placementInput = z.object({ itemId: z.string().min(1) });

export const packageWebhookProcedures = {
  webhooks: admin.input(placementInput).query(async ({ ctx, input }) => {
    const resolved = await resolvePackagePlacement(ctx, input.itemId);
    const currentDigest = await getWebhookAuthorizationDigest(ctx, resolved);
    const rows = await ctx.db.query.customWidgetStorage.findMany({
      where: and(
        eq(customWidgetStorage.installationId, resolved.installation.id),
        eq(customWidgetStorage.ownerKey, input.itemId),
      ),
    });
    return rows.filter(isWebhookStorage).flatMap((row) => {
      const parsed = webhookRecordSchema.safeParse(JSON.parse(row.value));
      if (!parsed.success) return [];
      const { tokenHash: _token, authorizationDigest, ...record } = parsed.data;
      return [{ ...record, current: authorizationDigest === currentDigest }];
    });
  }),
  createWebhook: admin.input(placementInput.extend({ handler: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const placement = await resolvePackagePlacement(ctx, input.itemId);
    return withWidgetInstallationLock(placement.installation.id, async () => {
      const resolved = await resolvePackagePlacement(ctx, input.itemId);
      const handler = resolved.artifact.manifest.handlers[input.handler];
      if (!handler || handler.kind !== "action" || !handler.inputSchema)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Webhooks require a named action with an input schema" });
      const id = createId();
      const token = randomBytes(32).toString("base64url");
      const record = {
        id,
        ...input,
        userId: ctx.session.user.id,
        tokenHash: packageDigest(token),
        authorizationDigest: await getWebhookAuthorizationDigest(ctx, resolved),
        createdAt: new Date().toISOString(),
      };
      await ctx.db.insert(customWidgetStorage).values({
        id: packageDigest([resolved.installation.id, webhookKey(id)]),
        installationId: resolved.installation.id,
        ownerKey: input.itemId,
        scope: "system",
        key: webhookKey(id),
        value: JSON.stringify(record),
        updatedAt: new Date(),
      });
      return { id, path: `/api/custom-widgets/webhooks/${input.itemId}/${id}`, token };
    });
  }),
  revokeWebhook: admin.input(placementInput.extend({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    await resolvePackagePlacement(ctx, input.itemId);
    const record = await getWebhookRecord(ctx, input.itemId, input.id);
    if (record) await ctx.db.delete(customWidgetStorage).where(eq(customWidgetStorage.id, record.row.id));
    return { revoked: true };
  }),
};
