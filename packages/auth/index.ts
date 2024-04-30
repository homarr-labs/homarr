import { cache } from "react";
import type { DefaultSession } from "@auth/core/types";

import { createConfiguration } from "./configuration";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export * from "./security";

export const createHandlers = (isCredentialsRequest: boolean) =>
  createConfiguration(isCredentialsRequest);
const { auth: defaultAuth } = createConfiguration(false);

/**
 * This is the main way to get session data for your RSCs.
 * This will de-duplicate all calls to next-auth's default `auth()` function and only call it once per request
 */
export const auth = cache(defaultAuth);
export { getSessionFromToken, sessionTokenCookieName } from "./session";
