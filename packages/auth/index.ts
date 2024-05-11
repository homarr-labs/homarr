import type { DefaultSession } from "@auth/core/types";

import type { GroupPermissionKey } from "@homarr/definitions";

import { createConfiguration } from "./configuration";

export type { Session } from "@auth/core/types";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      permissions: GroupPermissionKey[];
    } & DefaultSession["user"];
  }
}

export * from "./security";

export const createHandlers = (isCredentialsRequest: boolean) =>
  createConfiguration(isCredentialsRequest);

export { getSessionFromToken, sessionTokenCookieName } from "./session";
