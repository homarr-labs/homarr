import { TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { createLogger } from "@homarr/core/infrastructure/logs";

type Logger = ReturnType<typeof createLogger>;

export function parseDisplayConfig(raw: string, id: string, logger: Logger, context: string): Record<string, unknown> {
  try {
    return superjson.parse(raw) as Record<string, unknown>;
  } catch {
    logger.error(context, { id });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
  }
}
