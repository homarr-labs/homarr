import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { anchorNotesListInputSchema, anchorNoteUpdateInputSchema, createIntegrationAsync } from "@homarr/integrations";
import { anchorNoteRequestHandler, anchorNotesListRequestHandler } from "@homarr/request-handler/anchor-notes";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const noteIdInput = z.object({
  noteId: z.string(),
});

export const anchorNotesRouter = createTRPCRouter({
  listNotes: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "anchor"))
    .input(anchorNotesListInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = anchorNotesListRequestHandler.handler(ctx.integration, { ...input, limit: input.limit ?? 50 });

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
  updateNote: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "anchor"))
    .input(anchorNoteUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const integrationInstance = await createIntegrationAsync(ctx.integration);

      try {
        const updatedNote = await integrationInstance.updateNoteAsync(input);

        const noteHandler = anchorNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });
        await noteHandler.invalidateAsync();

        return updatedNote;
      } catch (error) {
        if (error instanceof ResponseError && error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to edit this note",
          });
        }

        if (error instanceof ResponseError && error.statusCode === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Note not found",
          });
        }

        throw error;
      }
    }),
});
