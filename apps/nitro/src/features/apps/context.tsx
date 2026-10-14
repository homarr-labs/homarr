import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { createAppProcedures } from "@homarr/api/nitro/routers/app";
import type { GroupPermissionKey } from "@homarr/definitions";
import { getAppManagementAccess } from "@homarr/definitions";

export type NativeAppClient = RouterClient<ReturnType<typeof createAppProcedures>>;
export type ManagedApp = Awaited<ReturnType<NativeAppClient["byId"]>>;
export type SelectableApp = Awaited<ReturnType<NativeAppClient["selectable"]>>[number];

export type AppsPrincipal =
  | { readonly kind: "anonymous" }
  | {
      readonly kind: "authenticated";
      readonly userId: string;
      readonly authorityRevision: string;
      readonly permissions: readonly GroupPermissionKey[];
    };

export interface AppsUnavailableCopy {
  readonly authentication: string;
  readonly permission: string;
  readonly readOnly: string;
  readonly iconSearch: string;
  readonly iconUpload: string;
  readonly integrationDetection: string;
  readonly health: string;
  readonly boardPlacement: string;
  readonly resource: string;
  readonly sharedForm: string;
  readonly discardChanges: string;
  readonly pageSize: string;
  readonly pingUrl: string;
}

export interface AppsFeatureContext {
  readonly client: { readonly app: NativeAppClient };
  readonly principal: AppsPrincipal;
  readonly readOnly: boolean;
  readonly unavailable: AppsUnavailableCopy;
}

const AppsContext = createContext<AppsFeatureContext | null>(null);

export function AppsFeatureProvider({ value, children }: { value: AppsFeatureContext; children: ReactNode }) {
  const key =
    value.principal.kind === "authenticated"
      ? `${value.principal.userId}:${value.principal.authorityRevision}`
      : "anonymous";
  return (
    <AppsContext.Provider key={key} value={value}>
      {children}
    </AppsContext.Provider>
  );
}

export function useAppsFeature() {
  const context = useContext(AppsContext);
  if (!context) throw new Error("AppsFeatureProvider is required");
  const permissions = context.principal.kind === "authenticated" ? context.principal.permissions : [];
  const access = getAppManagementAccess(permissions);
  const scope =
    context.principal.kind === "authenticated"
      ? [context.principal.userId, context.principal.authorityRevision]
      : ["anonymous"];
  const prefix = JSON.stringify(["nitro", "apps", ...scope]);
  const query = useMemo(() => createTanstackQueryUtils(context.client, { prefix }), [context.client, prefix]);
  const queryKey = query.app.key();
  return {
    ...context,
    ...access,
    canDelete: permissions.includes("app-full-all"),
    query,
    queryKey,
  };
}
