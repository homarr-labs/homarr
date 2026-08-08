import type { PropsWithChildren } from "react";
import { createElement, useEffect } from "react";

interface QuerySession {
  user: {
    id: string;
    permissions: string[];
  };
}

export const getSessionQueryScope = (session: QuerySession | null | undefined) =>
  session ? JSON.stringify([session.user.id, session.user.permissions.toSorted()]) : null;

interface SessionQueryScopeGuardProps {
  initialScope: string | null;
  currentScope: string | null;
  onScopeChange: () => void;
}

export const SessionQueryScopeGuard = ({
  initialScope,
  currentScope,
  onScopeChange,
  children,
}: PropsWithChildren<SessionQueryScopeGuardProps>) => {
  const hasScopeChanged = initialScope !== currentScope;
  useEffect(() => {
    if (hasScopeChanged) onScopeChange();
  }, [hasScopeChanged, onScopeChange]);

  if (!hasScopeChanged) return children;

  return createElement("div", {
    "aria-busy": true,
    "aria-label": "Refreshing session",
    role: "status",
    style: { minHeight: "100dvh" },
  });
};
