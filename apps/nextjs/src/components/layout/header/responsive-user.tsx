"use client";

import type { PropsWithChildren } from "react";

import { useIsMobileBoard } from "../../board/use-mobile-board";

export const ResponsiveUserButton = ({
  hideOnMobileBoard,
  children,
}: PropsWithChildren<{ hideOnMobileBoard: boolean }>) => {
  const isMobileBoard = useIsMobileBoard();
  return hideOnMobileBoard && isMobileBoard ? null : children;
};
