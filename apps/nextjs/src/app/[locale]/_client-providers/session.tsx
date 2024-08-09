"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import dayjs from "dayjs";

import type { Session } from "@homarr/auth";
import { SessionProvider, signIn } from "@homarr/auth/client";

interface AuthProviderProps {
  session: Session | null;
}

export const AuthProvider = ({ children, session }: PropsWithChildren<AuthProviderProps>) => {
  useLoginRedirectOnSessionExpiry(session);
  return <SessionProvider session={session}>{children}</SessionProvider>;
};

const useLoginRedirectOnSessionExpiry = (session: Session | null) => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    if (!session) return () => {};
    //setTimeout doesn't allow for a number higher than 2147483647 (2³¹-1 , or roughly 24 days)
    const timeout = setTimeout(() => void signIn(), Math.min(dayjs(session.expires).diff(), 2147483647));
    return () => clearTimeout(timeout);
  }, [session]);
};
