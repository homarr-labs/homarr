import { TRPCError } from "@trpc/server";
import z from "zod";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";
import type { TimetableResolvedAddress } from "@homarr/request-handler/timetable";
import {
  timetableGetTimetableRequestHandler,
  timetableSearchStationsRequestHandler,
} from "@homarr/request-handler/timetable";
import { DEFAULT_TIMETABLE_BASE_URL } from "@homarr/request-handler/timetable-url";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import {
  getSavedTimetableBaseUrl,
  normalizeTimetableBaseUrlOrThrowBadRequest,
  resolvePublicTimetableAddressesAsync,
} from "../timetable-options-validation";

const baseUrlSchema = z.string().url().max(2_048);
const timetableSourceSchema = z.object({
  baseUrl: baseUrlSchema,
  itemId: z.string().max(100).optional(),
  boardId: z.string().max(100).optional(),
});
interface ResolvedTimetableSource {
  baseUrl: string;
  pinnedAddresses?: TimetableResolvedAddress[];
}

const resolveTimetableBaseUrlAsync = async (
  ctx: { db: Database; session: Session | null },
  input: z.infer<typeof timetableSourceSchema>,
  allowBoardConfiguration = false,
): Promise<ResolvedTimetableSource> => {
  const requestedBaseUrl = normalizeTimetableBaseUrlOrThrowBadRequest(input.baseUrl);
  if (allowBoardConfiguration) {
    if (input.boardId) {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      if (input.itemId) {
        const item = await ctx.db.query.items.findFirst({
          columns: { id: true },
          where: and(eq(items.id, input.itemId), eq(items.kind, "timetable"), eq(items.boardId, input.boardId)),
        });
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Timetable widget not found" });
      }
      if (requestedBaseUrl === DEFAULT_TIMETABLE_BASE_URL) {
        return { baseUrl: requestedBaseUrl };
      }

      // Resolve immediately before every custom request. A URL that was public when saved can later resolve to a
      // private address, so matching the persisted value is not sufficient protection against DNS rebinding.
      const pinnedAddresses = await resolvePublicTimetableAddressesAsync(requestedBaseUrl);
      return { baseUrl: requestedBaseUrl, pinnedAddresses };
    }
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Board modify access is required for this endpoint" });
    }
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }
  if (!input.itemId) {
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A saved timetable widget is required for this endpoint" });
    }
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }

  const item = await ctx.db.query.items.findFirst({
    where: and(eq(items.id, input.itemId), eq(items.kind, "timetable")),
  });
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Timetable widget not found" });

  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const savedBaseUrl = getSavedTimetableBaseUrl(item.options);
  if (requestedBaseUrl !== savedBaseUrl) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Timetable URL does not match the saved widget" });
  }
  if (savedBaseUrl === DEFAULT_TIMETABLE_BASE_URL) return { baseUrl: savedBaseUrl };

  const pinnedAddresses = await resolvePublicTimetableAddressesAsync(savedBaseUrl);
  return { baseUrl: savedBaseUrl, pinnedAddresses };
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
      const { baseUrl, pinnedAddresses } = await resolveTimetableBaseUrlAsync(ctx, input);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableGetTimetableRequestHandler
        .handler({ ...handlerInput, baseUrl, pinnedAddresses })
        .getDataAsync();
      return data;
    }),
  searchStations: publicProcedure
    .input(
      timetableSourceSchema.extend({
        query: z.string().max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { baseUrl, pinnedAddresses } = await resolveTimetableBaseUrlAsync(ctx, input, true);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableSearchStationsRequestHandler
        .handler({ ...handlerInput, baseUrl, pinnedAddresses })
        .getDataAsync();
      return data;
    }),
});
