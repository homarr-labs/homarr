"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { WidgetKind } from "@homarr/definitions";

export interface CapturedStaticWidgetInputOwner {
  isCurrent(): boolean;
}

export interface StaticWidgetInputOwnerProviderProps {
  owner: CapturedStaticWidgetInputOwner;
  children: ReactNode;
}

const StaticWidgetInputOwnerContext = createContext<CapturedStaticWidgetInputOwner | null>(null);

export const StaticWidgetInputOwnerProvider = ({ owner, children }: StaticWidgetInputOwnerProviderProps) => (
  <StaticWidgetInputOwnerContext.Provider value={owner}>{children}</StaticWidgetInputOwnerContext.Provider>
);

export const useStaticWidgetInputOwner = (kind: WidgetKind, property: string): CapturedStaticWidgetInputOwner => {
  const capturedOwner = useContext(StaticWidgetInputOwnerContext);
  if (!capturedOwner) throw new Error("Static widget input used outside of its owner provider");

  const binding = useMemo(() => ({ capturedOwner, kind, property }), [capturedOwner, kind, property]);
  const current = useRef<{ active: boolean; binding: typeof binding } | null>(null);
  const [published, setPublished] = useState<typeof current.current>(null);

  useLayoutEffect(() => {
    if (current.current) current.current.active = false;
    const lease = { active: true, binding };
    current.current = lease;
    setPublished(lease);
    return () => {
      lease.active = false;
      if (current.current === lease) current.current = null;
    };
  }, [binding]);

  return useMemo(() => {
    const lease = published;
    return {
      isCurrent: () => {
        if (!lease?.active || current.current !== lease || lease.binding !== binding) return false;
        if (capturedOwner.isCurrent()) return true;
        lease.active = false;
        return false;
      },
    };
  }, [binding, capturedOwner, published]);
};
