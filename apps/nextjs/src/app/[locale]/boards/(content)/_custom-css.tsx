"use client";

import { useRequiredBoard } from "./_context";

export const CustomCss = () => {
  const board = useRequiredBoard();

  return <style>{board.customCss}</style>;
};
