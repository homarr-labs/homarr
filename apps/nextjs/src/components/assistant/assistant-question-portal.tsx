"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

const AssistantQuestionPortalContext = createContext<HTMLElement | null>(null);

export const AssistantQuestionPortalProvider = ({
  children,
  target,
}: PropsWithChildren<{ target: HTMLElement | null }>) => (
  <AssistantQuestionPortalContext.Provider value={target}>{children}</AssistantQuestionPortalContext.Provider>
);

export const AssistantPendingQuestionPortal = ({ children }: { children: ReactNode }) => {
  const target = useContext(AssistantQuestionPortalContext);
  return target ? createPortal(children, target) : children;
};
