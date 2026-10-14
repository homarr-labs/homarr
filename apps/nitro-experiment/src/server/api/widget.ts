import { readWidgetSnapshot, controlSource } from "../widget/service";
import { rpc } from "./implementer";

export const widgetReadProcedure = rpc.widget.read.handler(({ context, input }) =>
  readWidgetSnapshot(context, input.boardId),
);
export const sourceControlProcedure = rpc.source.control.handler(({ context, input }) => controlSource(context, input));
