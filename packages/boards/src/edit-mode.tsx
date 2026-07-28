"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import { useDisclosure } from "@mantine/hooks";

const EditModeContext = createContext<ReturnType<typeof useDisclosure> | null>(null);

export const boardEditActionEventName = "homarr:board-edit-action";

export type BoardEditActionResult = boolean | void;
export type BoardEditAction = () => BoardEditActionResult | Promise<BoardEditActionResult>;
export type BoardEditActionEvent = CustomEvent<{ action: BoardEditAction }>;

const reportBoardEditActionError = (error: unknown) => {
  const reportError = (globalThis as { reportError?: (reportedError: unknown) => void }).reportError;
  if (reportError) {
    reportError(error);
    return;
  }

  console.error("Board edit action failed", error);
};

const runBoardEditAction = (action: BoardEditAction) => {
  try {
    void Promise.resolve(action()).catch(reportBoardEditActionError);
  } catch (error) {
    reportBoardEditActionError(error);
  }
};

export const requestBoardEditAction = (action: BoardEditAction) => {
  if (typeof document === "undefined") {
    runBoardEditAction(action);
    return;
  }

  const event: BoardEditActionEvent = new CustomEvent(boardEditActionEventName, {
    cancelable: true,
    detail: { action },
  });

  if (document.dispatchEvent(event)) {
    runBoardEditAction(action);
  }
};

const noop = () => undefined;
const readOnlyEditMode = [false, { open: noop, close: noop, toggle: noop, set: noop }] satisfies ReturnType<
  typeof useDisclosure
>;

export const EditModeProvider = ({ children }: PropsWithChildren) => {
  const editModeDisclosure = useDisclosure(false);

  return <EditModeContext.Provider value={editModeDisclosure}>{children}</EditModeContext.Provider>;
};

export const ReadOnlyEditModeProvider = ({ children }: PropsWithChildren) => (
  <EditModeContext.Provider value={readOnlyEditMode}>{children}</EditModeContext.Provider>
);

export const useEditMode = () => {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error("EditMode is required");
  }

  return context;
};
