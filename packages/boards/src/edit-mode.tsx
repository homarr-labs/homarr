"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";

const EditModeContext = createContext<ReturnType<typeof useDisclosure> | null>(null);

export const EditModeProvider = ({ children, initialOpen = false }: PropsWithChildren<{ initialOpen?: boolean }>) => {
  const editModeDisclosure = useDisclosure(initialOpen);
  const [, { open }] = editModeDisclosure;

  useEffect(() => {
    if (initialOpen) open();
  }, [initialOpen, open]);

  return <EditModeContext.Provider value={editModeDisclosure}>{children}</EditModeContext.Provider>;
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error("EditMode is required");
  }

  return context;
};

export const useOptionalEditMode = (): boolean => {
  const context = useContext(EditModeContext);
  return context ? context[0] : false;
};
