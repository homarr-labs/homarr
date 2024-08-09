"use client";

import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";

import type { Session } from "@homarr/auth";
import { SessionProvider } from "@homarr/auth/client";

interface AuthProviderProps extends AuthContextProps {
  session: Session | null;
}

export const AuthProvider = ({ children, session, logoutUrl }: PropsWithChildren<AuthProviderProps>) => {
  return (
    <SessionProvider session={session}>
      <AuthContext.Provider value={{ logoutUrl }}>{children}</AuthContext.Provider>
    </SessionProvider>
  );
};

interface AuthContextProps {
  logoutUrl: string | undefined;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");

  return context;
};
