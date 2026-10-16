import { cookies } from "next/headers";
import NextAuth from "next-auth";

import type { SupportedAuthProvider } from "@homarr/definitions";

import { createAuthConfiguration } from "./core-configuration";

export const createConfiguration = (
  provider: SupportedAuthProvider | "unknown",
  headers: Pick<Headers, "get"> | null,
  useSecureCookies: boolean,
) =>
  NextAuth(
    createAuthConfiguration(provider, headers, useSecureCookies, {
      get: async (name) => (await cookies()).get(name)?.value,
      set: async (name, value, options) => {
        (await cookies()).set(name, value, options);
      },
    }),
  );
