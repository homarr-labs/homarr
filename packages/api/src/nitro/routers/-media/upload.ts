import { ORPCError } from "@orpc/server";

import type { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import type { medias } from "@homarr/db/schema";
import { mediaUploadSchema } from "@homarr/validation/media";

import type { BackendContext } from "../../context";

export interface MediaUploadPreparationResources {
  readonly createId: typeof createId;
  assertCurrentAsync(): Promise<void>;
}

export async function prepareMediaUploadAsync(
  context: BackendContext,
  readInputAsync: () => Promise<unknown>,
  resources: MediaUploadPreparationResources,
): Promise<InferInsertModel<typeof medias>[]> {
  context.signal.throwIfAborted();
  if (context.principal.kind !== "authenticated") throw new ORPCError("UNAUTHORIZED");
  if (!context.principal.user.permissions.includes("media-upload"))
    throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
  if (context.demo.enabled && context.demo.readOnly)
    throw new ORPCError("FORBIDDEN", { message: "Mutations are disabled in demo mode" });
  await resources.assertCurrentAsync();
  context.signal.throwIfAborted();
  const rawInput = await readInputAsync();
  await resources.assertCurrentAsync();
  context.signal.throwIfAborted();
  const input = await mediaUploadSchema.parseAsync(rawInput);
  const rows: InferInsertModel<typeof medias>[] = [];
  for (const file of input.files) {
    await resources.assertCurrentAsync();
    context.signal.throwIfAborted();
    const id = resources.createId();
    const content = Buffer.from(await file.arrayBuffer());
    await resources.assertCurrentAsync();
    context.signal.throwIfAborted();
    rows.push({
      id,
      creatorId: context.principal.user.id,
      content,
      size: file.size,
      contentType: file.type,
      name: file.name,
    });
  }
  return rows;
}
