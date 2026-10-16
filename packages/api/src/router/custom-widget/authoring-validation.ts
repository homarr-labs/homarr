import { ApiError } from "../../procedure";
import { z } from "zod/v4";

/**
 * Authoring inputs that use templateLines can only validate the joined JSX after the oRPC input
 * parser has run. Preserve those Zod issues as a client-safe BAD_REQUEST instead of letting oRPC
 * turn them into a generic internal error.
 */
export function parseCustomWidgetAuthoringInput<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "The custom widget authoring input is invalid",
        cause: error,
      });
    }
    throw error;
  }
}
