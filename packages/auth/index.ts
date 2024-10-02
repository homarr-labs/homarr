import { headers } from "next/headers";
import type { DefaultSession } from "@auth/core/types";

import type { ColorScheme, GroupPermissionKey, SupportedAuthProvider } from "@homarr/definitions";

import { createConfiguration } from "./configuration";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      permissions: GroupPermissionKey[];
      colorScheme: ColorScheme;
    } & DefaultSession["user"];
  }
}

export * from "./security";

export const createHandlers = (provider: SupportedAuthProvider | "unknown") => createConfiguration(provider, headers());

export { getSessionFromTokenAsync as getSessionFromToken, sessionTokenCookieName } from "./session";
