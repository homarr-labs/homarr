import { ORPCError } from "@orpc/server";

import type { BoardId, BoardProjection, BoardRecord } from "../../contracts/schemas";
import { boardProjectionSchema } from "../../contracts/schemas";
import { authorizeBoardRead } from "../access/guards";
import type { RequestContext } from "../context/request";
import { rpc } from "./implementer";

export async function readAuthorizedBoardRecord(
  context: RequestContext,
  boardId: BoardId,
): Promise<{ record: BoardRecord; projection: BoardProjection }> {
  const record = await context.repository.readBoard(boardId);
  if (!record) throw new ORPCError("NOT_FOUND", { data: { reason: "missing-board" } });
  const capabilities = authorizeBoardRead(context, record);
  const projection = boardProjectionSchema.parse({
    id: record.id,
    visibility: record.visibility,
    revision: record.revision,
    content: record.content,
    capabilities,
  });
  return { record, projection };
}

export async function readAuthorizedBoard(context: RequestContext, boardId: BoardId): Promise<BoardProjection> {
  return (await readAuthorizedBoardRecord(context, boardId)).projection;
}

export const boardReadProcedure = rpc.board.read.handler(({ context, input }) =>
  readAuthorizedBoard(context, input.boardId),
);
