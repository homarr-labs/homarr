import type { PropsWithChildren } from "react";

export const ManageTourGate = async ({
  enabled,
  isAdmin,
  children,
}: PropsWithChildren<{ enabled: boolean; isAdmin: boolean }>) => {
  if (!enabled) return children;

  const { ManageTourProvider } = await import("./manage-tour");
  return <ManageTourProvider isAdmin={isAdmin}>{children}</ManageTourProvider>;
};
