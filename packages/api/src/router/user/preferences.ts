import { TRPCError } from "@trpc/server";
import type { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import type { Database, InferInsertModel } from "@homarr/db";
import { eq } from "@homarr/db";
import { boards, searchEngines, users } from "@homarr/db/schema";
import { userPreferencesPatchSchema, userPreferencesSchema } from "@homarr/validation/user";
import {
  getHeaderItems,
  parseHeaderPreferences,
  serializeHeaderPreferences,
} from "@homarr/validation/header-preferences";

import { getAccessibleBoardIdsForUserAsync } from "../board";
import { throwIfActionForbiddenAsync } from "../board/board-access";

interface PreferencesContext {
  db: Database;
  session: Session;
}

const definedFields = <TValue extends object>(value: TValue): TValue =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as TValue;

export async function getUserPreferencesAsync(ctx: PreferencesContext, userId: string) {
  if (ctx.session.user.id !== userId && !ctx.session.user.permissions.includes("admin"))
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  const row = await ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      colorScheme: true,
      byteUnitSystem: true,
      firstDayOfWeek: true,
      pingIconsEnabled: true,
      enableRightClickOnWidgets: true,
      homeBoardId: true,
      mobileHomeBoardId: true,
      defaultSearchEngineId: true,
      openSearchInNewTab: true,
      ddgBangs: true,
      headerPreferences: true,
    },
  });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return { userId, ...row, headerPreferences: parseHeaderPreferences(row.headerPreferences) };
}

export async function updateUserPreferencesAsync(
  ctx: PreferencesContext,
  userId: string,
  input: z.infer<typeof userPreferencesPatchSchema>,
) {
  const current = await getUserPreferencesAsync(ctx, userId);
  const parsed = userPreferencesPatchSchema.safeParse(definedFields(input));
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error.message, cause: parsed.error });
  const patch = parsed.data;
  const { headerPreferences, ...fields } = patch;
  const mergedHeader = {
    ...current.headerPreferences,
    ...definedFields(headerPreferences ?? {}),
    zones: { ...current.headerPreferences.zones, ...definedFields(headerPreferences?.zones ?? {}) },
  };
  const { userId: _userId, ...preferences } = current;
  const mergedResult = userPreferencesSchema.safeParse({ ...preferences, ...fields, headerPreferences: mergedHeader });
  if (!mergedResult.success)
    throw new TRPCError({ code: "BAD_REQUEST", message: mergedResult.error.message, cause: mergedResult.error });
  const merged = mergedResult.data;

  for (const boardId of [fields.homeBoardId, fields.mobileHomeBoardId]) {
    if (boardId) await throwIfActionForbiddenAsync(ctx, eq(boards.id, boardId), "view");
  }
  if (fields.defaultSearchEngineId) {
    const engine = await ctx.db.query.searchEngines.findFirst({
      columns: { id: true },
      where: eq(searchEngines.id, fields.defaultSearchEngineId),
    });
    if (!engine) throw new TRPCError({ code: "BAD_REQUEST", message: "Search engine not found" });
  }
  if (headerPreferences) {
    const existingBoardIds = new Set(
      getHeaderItems(current.headerPreferences.zones).flatMap((item) => (item.type === "board" ? [item.boardId] : [])),
    );
    const newBoardIds = getHeaderItems(merged.headerPreferences.zones).flatMap((item) => {
      if (item.type !== "board" || existingBoardIds.has(item.boardId)) return [];
      return [item.boardId];
    });
    if (newBoardIds.length > 0) {
      const accessible = await getAccessibleBoardIdsForUserAsync(ctx.db, userId);
      if (newBoardIds.some((boardId) => !accessible.has(boardId)))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more board shortcuts are unavailable to this user",
        });
    }
  }

  // All references and the merged header are validated before the single preference write.
  const values: Partial<InferInsertModel<typeof users>> = { ...fields };
  if (headerPreferences) values.headerPreferences = serializeHeaderPreferences(merged.headerPreferences);
  await ctx.db.update(users).set(values).where(eq(users.id, userId));
  return { userId, ...merged };
}
