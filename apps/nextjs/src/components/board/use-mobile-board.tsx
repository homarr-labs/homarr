"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import { useMediaQuery } from "@mantine/hooks";

export const mobileBoardMediaQuery = "(max-width: 48em)";

const InitialMobileBoardContext = createContext<boolean | undefined>(undefined);

export const MobileBoardViewportProvider = ({
  initialIsMobile,
  children,
}: PropsWithChildren<{ initialIsMobile: boolean }>) => (
  <InitialMobileBoardContext.Provider value={initialIsMobile}>{children}</InitialMobileBoardContext.Provider>
);

export const useIsMobileBoard = () => {
  const initialIsMobile = useContext(InitialMobileBoardContext);
  return useMediaQuery(mobileBoardMediaQuery, initialIsMobile, { getInitialValueInEffect: true });
};
