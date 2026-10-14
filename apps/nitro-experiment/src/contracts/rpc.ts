import { oc } from "@orpc/contract";

import {
  apiErrors,
  boardReadInputSchema,
  boardReadOutputSchema,
  boardSaveInputSchema,
  boardSaveOutputSchema,
  emptyInputSchema,
  sessionLogoutOutputSchema,
  sessionSelectInputSchema,
  sessionStateSchema,
  sourceControlInputSchema,
  sourceControlOutputSchema,
  widgetReadInputSchema,
  widgetReadOutputSchema,
} from "./schemas";

const procedure = oc.errors(apiErrors);

export const rpcContract = {
  board: {
    read: procedure.input(boardReadInputSchema).output(boardReadOutputSchema),
    save: procedure.input(boardSaveInputSchema).output(boardSaveOutputSchema),
  },
  widget: { read: procedure.input(widgetReadInputSchema).output(widgetReadOutputSchema) },
  session: {
    current: procedure.input(emptyInputSchema).output(sessionStateSchema),
    select: procedure.input(sessionSelectInputSchema).output(sessionStateSchema),
    logout: procedure.input(emptyInputSchema).output(sessionLogoutOutputSchema),
  },
  source: { control: procedure.input(sourceControlInputSchema).output(sourceControlOutputSchema) },
};
