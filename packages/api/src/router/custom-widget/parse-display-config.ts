import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson } from "superjson";

import type { createLogger } from "@homarr/core/infrastructure/logs";
import { displayConfigSchema } from "@homarr/custom-widgets/core";
import type { DisplayConfig } from "@homarr/custom-widgets/core";

type Logger = ReturnType<typeof createLogger>;

export function parseDisplayConfig(raw: string, id: string, logger: Logger, context: string): DisplayConfig {
  try {
    return displayConfigSchema.parse(parseSuperJson(raw));
  } catch {
    logger.error(context, { id });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
  }
}
