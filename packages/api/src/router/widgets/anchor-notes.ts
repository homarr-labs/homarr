import { z } from "zod/v4";

import { anchorNoteRequestHandler, anchorNotesListRequestHandler } from "@homarr/request-handler/anchor-notes";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const listNotesInput = z.object({
  search: z.string().optional(),
  tagId: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
});

export const anchorNotesRouter = createTRPCRouter({
  listNotes: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "anchor"))
    .input(listNotesInput)
    .query(async ({ ctx, input }) => {
      const handler = anchorNotesListRequestHandler.handler(ctx.integration, {
        search: input.search,
        tagId: input.tagId,
        limit: input.limit ?? 50,
      });

      const { data } = await handler.getCachedOrUpdatedDataAsync({
        forceUpdate: false,
      });

      return data;
    }),
  getNote: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "anchor"))
    .input(
      z.object({
        noteId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const handler = anchorNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });

      const { data } = await handler.getCachedOrUpdatedDataAsync({
        forceUpdate: false,
      });

      return data;
    }),
});
