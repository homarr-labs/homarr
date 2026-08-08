import type { PropsWithChildren } from "react";

export const BoardTourGate = async ({ enabled, children }: PropsWithChildren<{ enabled: boolean }>) => {
  if (!enabled) return children;

  // Native server-side import keeps the completed-user client graph lean while
  // giving first-time users one stable board tree instead of swapping a
  // Suspense fallback after GridStack has mounted.
  const { BoardTourProvider } = await import("./board-tour");
  return <BoardTourProvider>{children}</BoardTourProvider>;
};
