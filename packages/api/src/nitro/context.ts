import type { SessionUser } from "@homarr/auth/nitro/context-types";
import type { FlattenError } from "@homarr/common/error";
import type { DeviceType } from "@homarr/common/request";
import type { Database } from "@homarr/db";
import type { OnboardingStep } from "@homarr/definitions";

export const backendContractRevision = "homarr.backend.source-port.v2" as const;

export type BackendPrincipal =
  | { readonly kind: "anonymous" }
  | {
      readonly kind: "authenticated";
      readonly user: Readonly<Omit<SessionUser, "permissions">> & {
        readonly permissions: readonly SessionUser["permissions"][number][];
      };
    };

export type BackendResponseEffect =
  | { readonly kind: "cookie"; readonly value: string }
  | { readonly kind: "header"; readonly name: string; readonly value: string; readonly mode: "set" | "append" };

export interface BackendRequestResources {
  readonly request: Request;
  readonly signal: AbortSignal;
  effect(effect: BackendResponseEffect): void;
  onDispose(dispose: () => void | Promise<void>): void;
}

export interface BackendSetupResources {
  isClaimOnlyAccessAllowed(db: Database, claimToken: string | undefined): Promise<boolean>;
  currentStep(db: Database): Promise<OnboardingStep>;
}

export interface BackendContext extends BackendRequestResources {
  readonly db: Database;
  readonly principal: BackendPrincipal;
  readonly deviceType: DeviceType;
  readonly baseUrl?: `${string}://${string}`;
  readonly onboardingClaimToken?: string;
  readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
  readonly setup: BackendSetupResources;
  flattenDomainError?(error: unknown): ReturnType<FlattenError["flatten"]> | null;
  reportError?(error: unknown): void;
}

export type AuthenticatedBackendContext = BackendContext & {
  readonly principal: Extract<BackendPrincipal, { kind: "authenticated" }>;
};

export function createBackendContext(resources: BackendContext): BackendContext {
  const principal: BackendPrincipal =
    resources.principal.kind === "anonymous"
      ? Object.freeze({ kind: "anonymous" })
      : Object.freeze({
          kind: "authenticated",
          user: Object.freeze({
            ...resources.principal.user,
            permissions: Object.freeze([...resources.principal.user.permissions]),
          }),
        });
  return Object.freeze({ ...resources, principal, demo: Object.freeze({ ...resources.demo }) });
}
