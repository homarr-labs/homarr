import type { Session } from "./index";
import { hashPasswordAsync } from "./index";
import { createSessionAsync } from "./server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, eq } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

const logger = createLogger({ module: "apiKeyAuth" });

/**
 * Validate an API key from the request header and return a session if valid.
 *
 * @param apiKeyHeaderValue - The value of the ApiKey header (format: "id.token")
 * @param ipAddress - The IP address of the request (for logging)
 * @param userAgent - The user agent of the request (for logging)
 * @returns A session if the API key is valid, null otherwise
 */
export const getSessionFromApiKeyAsync = async (
  apiKeyHeaderValue: string | null,
  ipAddress: string | null,
  userAgent: string,
): Promise<Session | null> => {
  if (apiKeyHeaderValue === null) {
    return null;
  }

  const [apiKeyId, apiKey] = apiKeyHeaderValue.split(".");

  if (!apiKeyId || !apiKey) {
    logger.warn("API key auth failed: invalid format", { ipAddress, userAgent });
    return null;
  }

  const apiKeyFromDb = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, apiKeyId),
    columns: {
      id: true,
      apiKey: true,
      salt: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!apiKeyFromDb) {
    logger.warn("API key auth failed: key not found", { ipAddress, userAgent });
    return null;
  }

  const hashedApiKey = await hashPasswordAsync(apiKey, apiKeyFromDb.salt);

  if (apiKeyFromDb.apiKey !== hashedApiKey) {
    logger.warn("API key auth failed: invalid key", { ipAddress, userAgent });
    return null;
  }

  logger.info("API key auth successful", {
    name: apiKeyFromDb.user.name,
    id: apiKeyFromDb.user.id,
  });

  return await createSessionAsync(db, apiKeyFromDb.user);
};
