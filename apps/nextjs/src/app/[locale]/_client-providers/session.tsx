"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import dayjs from "dayjs";
import { SessionContext } from "next-auth/react";

import type { Session } from "@homarr/auth";
import { SessionProvider, signIn } from "@homarr/auth/client";

interface AuthProviderProps {
  logoutUrl: string | undefined;
  session: Session | null;
  onSignOut?: () => void;
  workerSession?: boolean;
}

export const AuthProvider = ({
  children,
  session,
  logoutUrl,
  onSignOut,
  workerSession = false,
}: PropsWithChildren<AuthProviderProps>) => {
  useLoginRedirectOnSessionExpiry(workerSession ? null : session);
  const logoutRedirectInProgress = useRef(false);
  const content = (
    <AuthContext.Provider value={{ logoutUrl, logoutRedirectInProgress, onSignOut }}>{children}</AuthContext.Provider>
  );

  if (workerSession) {
    if (!session)
      return (
        <SessionContext.Provider value={{ data: null, status: "unauthenticated", update: async () => null }}>
          {content}
        </SessionContext.Provider>
      );
    // Worker sessions are already authorized by the encrypted channel. Never ask
    // the hosted frontend's cookie endpoint to replace this worker's identity.
    return (
      <SessionContext.Provider value={{ data: session, status: "authenticated", update: async () => session }}>
        {content}
      </SessionContext.Provider>
    );
  }

  return (
    <SessionProvider session={session} refetchOnWindowFocus={!workerSession} refetchInterval={0}>
      {content}
    </SessionProvider>
  );
};

interface AuthContextProps {
  logoutRedirectInProgress: { current: boolean };
  logoutUrl: string | undefined;
  onSignOut?: () => void;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");

  return context;
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
