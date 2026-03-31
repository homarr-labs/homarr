import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { anchorNotesListInputSchema, anchorNoteUpdateInputSchema, createIntegrationAsync } from "@homarr/integrations";
import { anchorNoteRequestHandler, anchorNotesListRequestHandler } from "@homarr/request-handler/anchor-notes";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const noteIdInput = z.object({
  noteId: z.string(),
});

const logger = createLogger({ module: "anchorNotesRouter" });

const isJsonDeltaString = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { ops?: unknown }).ops);
  } catch {
    return false;
  }
};

const normalizeAnchorContent = (content: string | undefined) => {
  if (content === undefined) return undefined;

  const trimmed = content.trim();
  if (!trimmed) {
    return JSON.stringify({ ops: [{ insert: "\n" }] });
  }

  if (isJsonDeltaString(content)) return content;

  const normalizedText = content.endsWith("\n") ? content : `${content}\n`;
  return JSON.stringify({ ops: [{ insert: normalizedText }] });
};

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
      const normalizedContent = normalizeAnchorContent(input.content);
      const isContentNormalized =
        input.content !== undefined && normalizedContent !== undefined && input.content !== normalizedContent;

      try {
        const updatedNote = await integrationInstance.updateNoteAsync({
          noteId: input.noteId,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
        });

        const noteHandler = anchorNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });
        await noteHandler.invalidateAsync();

        return updatedNote;
      } catch (error) {
        if (error instanceof ResponseError && error.statusCode === 400) {
          logger.warn("Anchor update note failed validation", {
            noteId: input.noteId,
            integrationId: ctx.integration.id,
            contentLength: input.content?.length ?? 0,
            contentIsJsonDelta: input.content ? isJsonDeltaString(input.content) : false,
            contentNormalized: isContentNormalized,
          });
        }

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
