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

export { getSessionFromToken, sessionTokenCookieName } from "./session";
