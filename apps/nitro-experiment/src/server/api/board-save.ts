import { saveBoard } from "../board-edit/service";
import { rpc } from "./implementer";

export const boardSaveProcedure = rpc.board.save.handler(({ context, input }) => saveBoard(context, input));
