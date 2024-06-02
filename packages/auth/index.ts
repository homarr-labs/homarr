import type { DefaultSession } from "next-auth";

import type { GroupPermissionKey } from "@homarr/definitions";

import { createConfiguration } from "./configuration";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      permissions: GroupPermissionKey[];
    } & DefaultSession["user"];
  }
}

export * from "./security";

export const createHandlers = (isCredentialsRequest: boolean) => createConfiguration(isCredentialsRequest);

export { getSessionFromTokenAsync as getSessionFromToken, sessionTokenCookieName } from "./session";
