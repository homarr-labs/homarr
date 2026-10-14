import { ORPCError, ValidationError } from "@orpc/server";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod/v4";

import type { BackendContext } from "./context";

export function toBackendError(
  error: unknown,
  context: Pick<BackendContext, "reportError" | "flattenDomainError">,
): ORPCError<string, unknown> {
  if (error instanceof ORPCError && error.code !== "INTERNAL_SERVER_ERROR") {
    if (error.code === "BAD_REQUEST" && error.cause instanceof ValidationError) {
      const formErrors: string[] = [];
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.cause.issues) {
        const firstSegment = issue.path?.[0];
        if (firstSegment === undefined) formErrors.push(issue.message);
        else {
          const key = String(typeof firstSegment === "object" ? firstSegment.key : firstSegment);
          (fieldErrors[key] ??= []).push(issue.message);
        }
      }
      return new ORPCError(error.code, {
        message: error.message,
        data: { zodError: { formErrors, fieldErrors }, error: null },
        cause: error,
      });
    }
    return error;
  }
  if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
    return new ORPCError(error.code, {
      message: error.message,
      data: {
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        error: context.flattenDomainError?.(error.cause) ?? null,
      },
      cause: error,
    });
  }
  if (error instanceof ZodError) {
    return new ORPCError("BAD_REQUEST", {
      message: "Input validation failed",
      data: { zodError: error.flatten(), error: null },
      cause: error,
    });
  }
  context.reportError?.(error);
  return new ORPCError("INTERNAL_SERVER_ERROR", { message: "Internal server error", cause: error });
}
