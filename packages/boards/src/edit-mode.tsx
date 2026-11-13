"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useDisclosure } from "@mantine/hooks";

type EditModeDisclosure = ReturnType<typeof useDisclosure>;

const EditModeContext = createContext<EditModeDisclosure | null>(null);

export const EditModeProvider = ({ children, initialOpen = false }: PropsWithChildren<{ initialOpen?: boolean }>) => {
  const [opened, { open, close, toggle, set }] = useDisclosure(initialOpen);
  const value = useMemo(
    (): EditModeDisclosure => [opened, { open, close, toggle, set }],
    [close, open, opened, set, toggle],
  );

  useEffect(() => {
    if (initialOpen) open();
  }, [initialOpen, open]);

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error("EditMode is required");
  }

  return context;
};
