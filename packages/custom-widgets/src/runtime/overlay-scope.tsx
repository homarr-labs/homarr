"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useMantineTheme } from "@mantine/core";

const OverlayTargetContext = createContext<HTMLElement | null>(null);
export const WidgetNestedOverlayContext = createContext(false);
export const WidgetStyleScopeContext = createContext<string | undefined>(undefined);

/** Trusted overlays escape widget clipping while retaining the widget's CSS and preview theme scope. */
export function WidgetOverlayProvider({
  scopeId,
  children,
  parent,
}: {
  scopeId: string;
  children: ReactNode;
  parent?: HTMLElement | null;
}) {
  const theme = useMantineTheme();
  const hostTarget: unknown = theme.components.Portal?.defaultProps?.target;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (parent === null) return;
    let container: Element = parent ?? document.body;
    if (!parent && hostTarget instanceof HTMLElement) container = hostTarget;
    else if (!parent && typeof hostTarget === "string") container = document.querySelector(hostTarget) ?? document.body;
    const node = document.createElement("div");
    node.dataset.cwScope = scopeId;
    node.dataset.cwOverlay = "";
    container.append(node);
    setTarget(node);
    return () => node.remove();
  }, [scopeId, hostTarget, parent]);
  return (
    <WidgetStyleScopeContext.Provider value={scopeId}>
      <OverlayTargetContext.Provider value={target}>
        <WidgetNestedOverlayContext.Provider value={false}>{children}</WidgetNestedOverlayContext.Provider>
      </OverlayTargetContext.Provider>
    </WidgetStyleScopeContext.Provider>
  );
}

export function useWidgetOverlayProps() {
  const target = useContext(OverlayTargetContext);
  const nested = useContext(WidgetNestedOverlayContext);
  if (!target || nested) return { withinPortal: false };
  return { withinPortal: true, portalProps: { target } };
}
