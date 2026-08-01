import { TRPCError } from "@trpc/server";
import { parse } from "superjson";
import z from "zod";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";
import {
  timetableGetTimetableRequestHandler,
  timetableSearchStationsRequestHandler,
} from "@homarr/request-handler/timetable";
import { DEFAULT_TIMETABLE_BASE_URL, normalizeTimetableBaseUrl } from "@homarr/request-handler/timetable-url";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

const baseUrlSchema = z.string().url().max(2_048);
const timetableSourceSchema = z.object({
  baseUrl: baseUrlSchema,
  itemId: z.string().max(100).optional(),
  boardId: z.string().max(100).optional(),
});

const resolveTimetableBaseUrlAsync = async (
  ctx: { db: Database; session: Session | null },
  input: z.infer<typeof timetableSourceSchema>,
  allowBoardConfiguration = false,
) => {
  const requestedBaseUrl = normalizeTimetableBaseUrl(input.baseUrl);
  if (allowBoardConfiguration) {
    if (input.boardId) {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      return requestedBaseUrl;
    }
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Board modify access is required for this endpoint" });
    }
    return DEFAULT_TIMETABLE_BASE_URL;
  }
  if (!input.itemId) {
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A saved timetable widget is required for this endpoint" });
    }
    return DEFAULT_TIMETABLE_BASE_URL;
  }

  const item = await ctx.db.query.items.findFirst({
    where: and(eq(items.id, input.itemId), eq(items.kind, "timetable")),
  });
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Timetable widget not found" });

  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const options = parse<Record<string, unknown>>(item.options);
  const savedBaseUrl = normalizeTimetableBaseUrl(
    typeof options.baseUrl === "string" ? options.baseUrl : DEFAULT_TIMETABLE_BASE_URL,
  );
  if (requestedBaseUrl !== savedBaseUrl) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Timetable URL does not match the saved widget" });
  }
  return savedBaseUrl;
};

export const timetableRouter = createTRPCRouter({
  getTimetable: publicProcedure
    .input(
      timetableSourceSchema.extend({
        stationId: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const baseUrl = await resolveTimetableBaseUrlAsync(ctx, input);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableGetTimetableRequestHandler.handler({ ...handlerInput, baseUrl }).getDataAsync();
      return data;
    }),
  searchStations: publicProcedure
    .input(
      timetableSourceSchema.extend({
        query: z.string().max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const baseUrl = await resolveTimetableBaseUrlAsync(ctx, input, true);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableSearchStationsRequestHandler.handler({ ...handlerInput, baseUrl }).getDataAsync();
      return data;
    }),
});
