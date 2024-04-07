"use client";

import type { PropsWithChildren } from "react";

import type { Session } from "@homarr/auth";
import { SessionProvider } from "@homarr/auth/client";

interface AuthProviderProps {
  session: Session | null;
}

export const AuthProvider = ({
  children,
  session,
}: PropsWithChildren<AuthProviderProps>) => {
  return <SessionProvider session={session}>{children}</SessionProvider>;
};
