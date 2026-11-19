import { TRPCError } from "@trpc/server";
import type { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import type { Database, InferInsertModel } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { boards, searchEngines, users } from "@homarr/db/schema";
import { userPreferencesPatchSchema, userPreferencesSchema } from "@homarr/validation/user";
import {
  getHeaderItems,
  parseHeaderPreferences,
  serializeHeaderPreferences,
} from "@homarr/validation/header-preferences";
import type { HeaderItem } from "@homarr/validation/header-preferences";

import { getAccessibleBoardIdsForUserAsync } from "../board";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { throwIfIntegrationActionsForbiddenAsync } from "../integration/integration-access";

interface PreferencesContext {
  db: Database;
  session: Session;
}

const definedFields = <TValue extends object>(value: TValue): TValue =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as TValue;

async function getUserPreferencesRowAsync(ctx: PreferencesContext, userId: string) {
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
  return row;
}

export async function getUserPreferencesAsync(ctx: PreferencesContext, userId: string) {
  const row = await getUserPreferencesRowAsync(ctx, userId);
  return { userId, ...row, headerPreferences: parseHeaderPreferences(row.headerPreferences) };
}

export async function throwIfHeaderWidgetIntegrationsForbiddenAsync(
  ctx: PreferencesContext,
  submittedItems: readonly HeaderItem[],
  storedItems: readonly HeaderItem[],
) {
  const storedWidgets = new Map(storedItems.filter((item) => item.type === "widget").map((item) => [item.id, item]));
  const newlyAddedIds = submittedItems.flatMap((item) => {
    if (item.type !== "widget") return [];
    const stored = storedWidgets.get(item.id);
    if (!stored || stored.kind !== item.kind) return item.integrationIds;
    return item.integrationIds.filter((id) => !stored.integrationIds.includes(id));
  });
  await throwIfIntegrationActionsForbiddenAsync(ctx, newlyAddedIds, "use");
}

export async function updateUserPreferencesAsync(
  ctx: PreferencesContext,
  userId: string,
  input: z.infer<typeof userPreferencesPatchSchema>,
) {
  let row = await getUserPreferencesRowAsync(ctx, userId);
  const parsed = userPreferencesPatchSchema.safeParse(definedFields(input));
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error.message, cause: parsed.error });
  const patch = parsed.data;
  const { headerPreferences, ...fields } = patch;
  let maxAttempts = 1;
  if (headerPreferences) maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) row = await getUserPreferencesRowAsync(ctx, userId);
    const currentHeader = parseHeaderPreferences(row.headerPreferences);
    const mergedHeader = {
      ...currentHeader,
      ...definedFields(headerPreferences ?? {}),
      zones: { ...currentHeader.zones, ...definedFields(headerPreferences?.zones ?? {}) },
    };
    const mergedResult = userPreferencesSchema.safeParse({ ...row, ...fields, headerPreferences: mergedHeader });
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
      const storedItems = getHeaderItems(currentHeader.zones);
      const submittedItems = getHeaderItems(merged.headerPreferences.zones);
      const existingBoardIds = new Set(storedItems.flatMap((item) => (item.type === "board" ? [item.boardId] : [])));
      const newBoardIds = submittedItems.flatMap((item) => {
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
      await throwIfHeaderWidgetIntegrationsForbiddenAsync(ctx, submittedItems, storedItems);
    }

    // All references are validated against the exact header used by the write.
    const values: Partial<InferInsertModel<typeof users>> = { ...fields };
    if (!headerPreferences) {
      await ctx.db.update(users).set(values).where(eq(users.id, userId));
      return { userId, ...merged };
    }
    values.headerPreferences = serializeHeaderPreferences(merged.headerPreferences);
    const updated = await ctx.db
      .update(users)
      .set(values)
      .where(and(eq(users.id, userId), eq(users.headerPreferences, row.headerPreferences)))
      .returning({ id: users.id });
    if (updated.length > 0) return { userId, ...merged };
  }
  throw new TRPCError({ code: "CONFLICT", message: "Header preferences changed too often to update" });
}
