import { TRPCError } from "@trpc/server";

import { env } from "../../env";
import { permissionRequiredProcedure } from "../../trpc";

export function assertCustomWidgetsEnabled(): void {
  // Environment validation is intentionally skipped in some build and test
  // processes, where unset defaulted values are exposed as undefined.
  if (env.CUSTOM_WIDGETS_ENABLED !== false) return;
  throw new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "Custom Widgets are temporarily disabled by the server administrator",
  });
}

export function assertWorkshopEnabled(): void {
  if (env.WORKSHOP_ENABLED !== false) return;
  throw new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "Workshop is temporarily disabled by the server administrator",
  });
}

export const customWidgetAdminProcedure = permissionRequiredProcedure.requiresPermission("admin").use(({ next }) => {
  assertCustomWidgetsEnabled();
  return next();
});

export const workshopAdminProcedure = customWidgetAdminProcedure.use(({ next }) => {
  assertWorkshopEnabled();
  return next();
});
