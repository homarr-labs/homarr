import Ajv from "ajv";
import { TRPCError } from "@trpc/server";

import type { WidgetPackageHandler } from "@homarr/custom-widgets/package";

const validator = new Ajv({ strict: false, validateFormats: false });

export function validatePackageHandlerInput(handler: WidgetPackageHandler, input: unknown) {
  if (!handler.inputSchema) return;
  let valid: boolean;
  try {
    valid = validator.validate(handler.inputSchema, input) as boolean;
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Widget handler input schema is invalid" });
  }
  if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: validator.errorsText() });
}
