"use client";

import type { PropsWithChildren } from "react";

import { ModalsManager } from "../modals";

export const ModalsProvider = ({ children }: PropsWithChildren) => {
  return <ModalsManager>{children}</ModalsManager>;
};
