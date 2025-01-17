import type { NextRequest } from "next/server";
import { userAgent } from "next/server";
import { createOpenApiFetchHandler } from "trpc-to-openapi";

import { appRouter, createTRPCContext } from "@homarr/api";
import type { Session } from "@homarr/auth";
import { hashPasswordAsync } from "@homarr/auth";
import { createSessionAsync } from "@homarr/auth/server";
import { db, eq } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";
import { logger } from "@homarr/log";

const handlerAsync = async (req: NextRequest) => {
  const apiKeyHeaderValue = req.headers.get("ApiKey");
  const ipAddress = req.headers.get("x-forwarded-for");
  const { ua } = userAgent(req);
  const session: Session | null = await getSessionOrDefaultFromHeadersAsync(apiKeyHeaderValue, ipAddress, ua);

  // Fallback to JSON if no content type is set
  if (!req.headers.has("Content-Type")) {
    req.headers.set("Content-Type", "application/json");
  }

  return createOpenApiFetchHandler({
    req,
    endpoint: "/",
    router: appRouter,
    createContext: () => createTRPCContext({ session, headers: req.headers }),
  });
};

const getSessionOrDefaultFromHeadersAsync = async (
  apiKeyHeaderValue: string | null,
  ipAdress: string | null,
  userAgent: string,
): Promise<Session | null> => {
  logger.info(
    `Creating OpenAPI fetch handler for user ${apiKeyHeaderValue ? "with an api key" : "without an api key"}`,
  );

  if (apiKeyHeaderValue === null) {
    return null;
  }

  const [apiKeyId, apiKey] = apiKeyHeaderValue.split(".");

  if (!apiKeyId || !apiKey) {
    logger.warn(
      `An attempt to authenticate over API has failed due to invalid API key format ip='${ipAdress}' userAgent='${userAgent}'`,
    );
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
    logger.warn(`An attempt to authenticate over API has failed ip='${ipAdress}' userAgent='${userAgent}'`);
    return null;
  }

  const hashedApiKey = await hashPasswordAsync(apiKey, apiKeyFromDb.salt);

  if (apiKeyFromDb.apiKey !== hashedApiKey) {
    logger.warn(`An attempt to authenticate over API has failed ip='${ipAdress}' userAgent='${userAgent}'`);
    return null;
  }

  logger.info(`Read session from API request and found user ${apiKeyFromDb.user.name} (${apiKeyFromDb.user.id})`);
  return await createSessionAsync(db, apiKeyFromDb.user);
};

export {
  handlerAsync as DELETE,
  handlerAsync as GET,
  handlerAsync as PATCH,
  handlerAsync as POST,
  handlerAsync as PUT,
};
