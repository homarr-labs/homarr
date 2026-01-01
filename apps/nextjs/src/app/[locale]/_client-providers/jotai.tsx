"use client";

import { Provider } from "jotai";
import type { PropsWithChildren } from "react";

export const JotaiProvider = ({ children }: PropsWithChildren) => {
  return <Provider>{children}</Provider>;
};
