import { createRouterClient } from "@orpc/server";

import type { RequestContext } from "../context/request";
import { boardReadProcedure } from "./board-read";
import { boardSaveProcedure } from "./board-save";
import { rpc } from "./implementer";
import { sessionProcedures } from "./session";
import { sourceControlProcedure, widgetReadProcedure } from "./widget";

export const apiRouter = rpc.router({
  board: { read: boardReadProcedure, save: boardSaveProcedure },
  widget: { read: widgetReadProcedure },
  session: sessionProcedures,
  source: { control: sourceControlProcedure },
});

export function createServerClient(context: RequestContext) {
  return createRouterClient(apiRouter, { context });
}
