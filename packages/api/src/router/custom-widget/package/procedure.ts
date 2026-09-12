import { TRPCError } from "@trpc/server";

import { permissionRequiredProcedure } from "../../../trpc";
import { refreshWidgetActor } from "./actor";

export const widgetPackageAdminProcedure = permissionRequiredProcedure
  .requiresPermission("admin")
  .use(async ({ ctx, next }) => {
    const current = await refreshWidgetActor(ctx);
    if (!current.session?.user.permissions.includes("admin")) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx: { ...ctx, session: current.session } });
  });
