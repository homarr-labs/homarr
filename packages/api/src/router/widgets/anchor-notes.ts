import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { createIntegrationAsync } from "@homarr/integrations";
import { anchorNoteRequestHandler, anchorNotesListRequestHandler } from "@homarr/request-handler/anchor-notes";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const listNotesInput = z.object({
  search: z.string().optional(),
  tagId: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
});

const noteIdInput = z.object({
  noteId: z.string(),
});

const updateNoteInput = noteIdInput.extend({
  title: z.string().optional(),
  content: z.string().optional(),
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
    .input(noteIdInput)
    .query(async ({ ctx, input }) => {
      const handler = anchorNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });

      const { data } = await handler.getCachedOrUpdatedDataAsync({
        forceUpdate: false,
      });

      return data;
    }),
  lockNote: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "anchor"))
    .input(noteIdInput)
    .mutation(async ({ ctx, input }) => {
      const integrationInstance = await createIntegrationAsync(ctx.integration);
      return await integrationInstance.lockNoteAsync(input.noteId);
    }),
  unlockNote: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "anchor"))
    .input(noteIdInput)
    .mutation(async ({ ctx, input }) => {
      const integrationInstance = await createIntegrationAsync(ctx.integration);
      return await integrationInstance.unlockNoteAsync(input.noteId);
    }),
  updateNote: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "anchor"))
    .input(updateNoteInput)
    .mutation(async ({ ctx, input }) => {
      const integrationInstance = await createIntegrationAsync(ctx.integration);
      try {
        const updatedNote = await integrationInstance.updateNoteAsync(input.noteId, {
          title: input.title,
          content: input.content,
        });
        const handler = anchorNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });
        await handler.invalidateAsync();
        return updatedNote;
      } catch (error) {
        if (error instanceof ResponseError && error.statusCode === 409) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Note is locked",
          });
        }
        throw error;
      }
    }),
});
