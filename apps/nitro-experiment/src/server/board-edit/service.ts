import { ORPCError } from "@orpc/server";

import type { BoardSaveInput, BoardSaveOutput } from "../../contracts/schemas";
import { boardSaveInputSchema, boardSaveOutputSchema } from "../../contracts/schemas";
import { assertMutationRequest, authorizeBoardRead, authorizeBoardWrite } from "../access/guards";
import type { RequestContext } from "../context/request";

export async function saveBoard(context: RequestContext, input: BoardSaveInput): Promise<BoardSaveOutput> {
  assertMutationRequest(context);
  const validated = boardSaveInputSchema.safeParse(input);
  if (!validated.success) throw new ORPCError("BAD_REQUEST", { data: { reason: "invalid-board-edit" } });
  const record = await context.repository.readBoard(validated.data.boardId);
  if (!record) throw new ORPCError("NOT_FOUND", { data: { reason: "missing-board" } });
  authorizeBoardWrite(context, record);
  context.signal.throwIfAborted();
  const result = await context.repository.compareAndSave(validated.data);
  authorizeBoardWrite(context, record);
  context.signal.throwIfAborted();
  if (result.status === "not-found") throw new ORPCError("NOT_FOUND", { data: { reason: "missing-board" } });
  if (result.status === "conflict") {
    throw new ORPCError("CONFLICT", { data: { currentRevision: result.currentRevision } });
  }
  const capabilities = authorizeBoardRead(context, result.board);
  return boardSaveOutputSchema.parse({
    board: {
      id: result.board.id,
      visibility: result.board.visibility,
      revision: result.board.revision,
      content: result.board.content,
      capabilities,
    },
  });
}
