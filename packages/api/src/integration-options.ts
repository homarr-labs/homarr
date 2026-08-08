import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson, stringify as stringifySuperJson } from "superjson";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { IntegrationKind, IntegrationOptions } from "@homarr/definitions";
import { getDefaultIntegrationOptions, parseIntegrationOptions } from "@homarr/definitions";

const logger = createLogger({ module: "integrationOptions" });

export const parseIntegrationOptionsInput = (kind: IntegrationKind, value: unknown): IntegrationOptions => {
  try {
    return parseIntegrationOptions(kind, value ?? {});
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid options for integration kind ${kind}`,
      cause: error,
    });
  }
};

export const serializeIntegrationOptions = (kind: IntegrationKind, value: unknown): string =>
  stringifySuperJson(parseIntegrationOptionsInput(kind, value));

export const deserializeIntegrationOptions = (kind: IntegrationKind, value: string): IntegrationOptions => {
  try {
    return parseIntegrationOptions(kind, parseSuperJson<unknown>(value));
  } catch (error) {
    logger.warn(
      new ErrorWithMetadata(
        "Failed to parse persisted integration options; using defaults",
        {
          integrationKind: kind,
        },
        { cause: error },
      ),
    );

    return getDefaultIntegrationOptions(kind);
  }
};
