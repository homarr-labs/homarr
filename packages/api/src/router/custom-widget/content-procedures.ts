import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { customWidgetIdentifierSchema, isCustomWidgetPreferenceValue } from "@homarr/custom-widgets/core";
import { and, eq, inArray } from "@homarr/db";
import { boards, customWidgetContent } from "@homarr/db/schema";

import { protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { resolvePlacedDefinitionAsync } from "./placed-definition";
import { assertCustomWidgetDefinitionChanged } from "./stored-definition-state";
import { acquireCustomWidgetRequestLimit } from "./request-limits";

const itemInput = z.object({ itemId: z.string().min(1).max(128) });
const contentValueSchema = z.union([
  z.string().max(8192),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(512)).max(256),
  z.array(z.number().finite()).max(256),
]);
const contentKey = (name: string) => createHash("sha256").update(name).digest("hex");

function readValue(serialized: string, type: string, fallback: z.infer<typeof contentValueSchema>) {
  try {
    const parsed = contentValueSchema.safeParse(JSON.parse(serialized));
    if (parsed.success && isCustomWidgetPreferenceValue(type, parsed.data)) return parsed.data;
  } catch {
    /* A changed declaration falls back to its current default. */
  }
  return fallback;
}

function isDuplicate(error: unknown, depth = 0): boolean {
  if (depth > 4 || !error || typeof error !== "object") return false;
  if (
    "code" in error &&
    ["SQLITE_CONSTRAINT_PRIMARYKEY", "SQLITE_CONSTRAINT_UNIQUE", "23505", "ER_DUP_ENTRY"].includes(String(error.code))
  )
    return true;
  return "cause" in error && isDuplicate(error.cause, depth + 1);
}

export const contentProcedures = {
  contentRead: publicProcedure.input(itemInput).query(async ({ ctx, input }) => {
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    const declarations = resolved.definition.extensions?.content ?? {};
    if (Object.keys(declarations).length === 0) return { values: {} };
    const rows = await ctx.db
      .select()
      .from(customWidgetContent)
      .where(
        and(
          eq(customWidgetContent.itemId, input.itemId),
          eq(customWidgetContent.definitionId, resolved.stored.id),
          inArray(customWidgetContent.key, Object.keys(declarations).map(contentKey)),
        ),
      );
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return {
      values: Object.fromEntries(
        Object.entries(declarations).map(([name, declaration]) => {
          const row = byKey.get(contentKey(name));
          if (!row) return [name, { value: declaration.defaultValue, revision: 0 }];
          return [
            name,
            { value: readValue(row.value, declaration.type, declaration.defaultValue), revision: row.revision },
          ];
        }),
      ),
    };
  }),

  contentWrite: protectedProcedure
    .input(
      itemInput.extend({
        name: customWidgetIdentifierSchema,
        expectedRevision: z.number().int().min(0).max(2_147_483_646),
        value: contentValueSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
      const declaration = resolved.definition.extensions?.content?.[input.name];
      if (!declaration)
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared content is not declared by this widget" });
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), declaration.permission);
      if (!isCustomWidgetPreferenceValue(declaration.type, input.value)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Shared content does not match its declared type" });
      }
      const revision = input.expectedRevision + 1;
      const entry = {
        itemId: input.itemId,
        definitionId: resolved.stored.id,
        key: contentKey(input.name),
        name: input.name,
        value: JSON.stringify(input.value),
        revision,
        updatedAt: new Date(),
      };
      const release = await acquireCustomWidgetRequestLimit({
        category: "action",
        userId: ctx.session.user.id,
        itemId: input.itemId,
        definitionId: resolved.stored.id,
      });
      try {
        if (input.expectedRevision === 0) {
          await ctx.db.insert(customWidgetContent).values(entry);
        } else {
          const result = await ctx.db
            .update(customWidgetContent)
            .set({ value: entry.value, revision, updatedAt: entry.updatedAt })
            .where(
              and(
                eq(customWidgetContent.itemId, input.itemId),
                eq(customWidgetContent.definitionId, resolved.stored.id),
                eq(customWidgetContent.key, entry.key),
                eq(customWidgetContent.revision, input.expectedRevision),
              ),
            );
          assertCustomWidgetDefinitionChanged(result);
        }
      } catch (error) {
        if (isDuplicate(error) || (error instanceof TRPCError && error.code === "CONFLICT")) {
          throw new TRPCError({ code: "CONFLICT", message: "Shared content changed. Reload it before saving again." });
        }
        throw error;
      } finally {
        await release();
      }
      return { name: input.name, value: input.value, revision };
    }),
};
