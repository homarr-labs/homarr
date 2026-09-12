import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { boards, customWidgetStorage } from "@homarr/db/schema";

import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { packageDigest } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import { publishWidgetPackageChange } from "./events";
import { previewValue } from "./preview-store";
import type { PackageContext } from "./types";

export const widgetStorageInputSchema = z.object({
  itemId: z.string().min(1),
  scope: z.enum(["user", "instance", "installation"]),
  key: z.string().min(1).max(128),
});
type StorageInput = z.infer<typeof widgetStorageInputSchema>;

function storageIdentity(ctx: PackageContext, resolved: ResolvedPackagePlacement, input: StorageInput) {
  let ownerKey = resolved.installation.id;
  if (input.scope === "instance") ownerKey = resolved.item.id;
  if (input.scope === "user") {
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    ownerKey = ctx.session.user.id;
  }
  return { ownerKey, id: packageDigest([resolved.installation.id, input.scope, ownerKey, input.key]) };
}

export async function readWidgetStorage(ctx: PackageContext, resolved: ResolvedPackagePlacement, input: StorageInput) {
  const { id } = storageIdentity(ctx, resolved, input);
  if (resolved.preview) {
    const raw = await previewValue(`storage:${resolved.preview.id}:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  }
  const row = await ctx.db.query.customWidgetStorage.findFirst({
    where: and(eq(customWidgetStorage.id, id), eq(customWidgetStorage.installationId, resolved.installation.id)),
  });
  if (!row) return null;
  return JSON.parse(row.value) as unknown;
}

export async function writeWidgetStorage(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  input: StorageInput & { value: unknown },
  authorizedHandler = false,
) {
  if (!authorizedHandler && !resolved.preview && input.scope !== "user") {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), "modify");
  }
  const identity = storageIdentity(ctx, resolved, input);
  const value = JSON.stringify(input.value);
  if (value === undefined || Buffer.byteLength(value) > 1_048_576) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Widget storage values must be JSON up to 1 MiB" });
  }
  if (resolved.preview) {
    await previewValue(`storage:${resolved.preview.id}:${identity.id}`, value);
    return { updatedAt: new Date() };
  }
  const row = {
    ...identity,
    installationId: resolved.installation.id,
    scope: input.scope,
    key: input.key,
    value,
    updatedAt: new Date(),
  };
  await handleTransactionsAsync(ctx.db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction.delete(schema.customWidgetStorage).where(eq(schema.customWidgetStorage.id, identity.id));
        await transaction.insert(schema.customWidgetStorage).values(row);
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        transaction.delete(customWidgetStorage).where(eq(customWidgetStorage.id, identity.id)).run();
        transaction.insert(customWidgetStorage).values(row).run();
      });
    },
  });
  await publishWidgetPackageChange({
    installationId: resolved.installation.id,
    itemIds: [resolved.item.id],
    kind: "storage",
  });
  return { updatedAt: row.updatedAt };
}
