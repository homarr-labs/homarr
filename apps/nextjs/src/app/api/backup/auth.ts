import type { NextRequest } from "next/server";
import { userAgent } from "next/server";

import { API_KEY_HEADER_NAME, getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { auth } from "@homarr/auth/next";
import { ipAddressFromHeaders } from "@homarr/common/server";
import { db } from "@homarr/db";

/**
 * Backups are not only triggered from the management UI but also from automated setups,
 * so an API key is accepted in addition to the browser session.
 */
export const getBackupSessionAsync = async (request: NextRequest) => {
  const apiKeyHeaderValue = request.headers.get(API_KEY_HEADER_NAME);

  if (apiKeyHeaderValue !== null) {
    const { ua } = userAgent(request);
    return await getSessionFromApiKeyAsync(db, apiKeyHeaderValue, ipAddressFromHeaders(request.headers), ua);
  }

  return await auth();
};
