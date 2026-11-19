"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";

import type { Session } from "@homarr/auth";
import { SessionProvider, signIn } from "@homarr/auth/client";

interface AuthProviderProps {
  logoutUrl: string | undefined;
  session: Session | null;
}

export const AuthProvider = ({ children, session, logoutUrl }: PropsWithChildren<AuthProviderProps>) => {
  useLoginRedirectOnSessionExpiry(session);
  const logoutRedirectInProgress = useRef(false);

  return (
    <SessionProvider session={session}>
      <AuthContext.Provider value={{ logoutUrl, logoutRedirectInProgress }}>{children}</AuthContext.Provider>
    </SessionProvider>
  );
};

interface AuthContextProps {
  logoutRedirectInProgress: { current: boolean };
  logoutUrl: string | undefined;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");

  return context;
};

const useLoginRedirectOnSessionExpiry = (session: Session | null) => {
  useEffect(() => {
    if (!session) return;
    const expiresAt = Date.parse(session.expires);
    if (!Number.isFinite(expiresAt)) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const checkExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        void signIn();
        return;
      }
      // Browsers cap a timeout at about 24 days; recheck longer sessions before redirecting.
      timeout = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    };
    checkExpiry();
    return () => clearTimeout(timeout);
  }, [session]);
};
