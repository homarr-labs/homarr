import type { BackendContext, BackendRequestResources } from "../context";
import type { SourceProcedureDescriptor } from "../procedure";
import type { SelectedSourcePath } from "./source-selection";
import { unavailableProjection } from "./selection";
import type { ProtocolHoldReason } from "./selection";

export interface ProtocolAdmissionRequirements {
  readonly authorization: "nativeMiddleware" | "unverified";
  readonly demo: "nativeMiddleware" | "unverified";
  readonly lifecycle: "requestResources" | "unverified";
  readonly input: "legacyWireContract" | "unverified";
  readonly errors: "legacySafeContract" | "unverified";
  readonly secrets: "sourceBoundaryPreserved" | "unverified";
  readonly result: "nonStreaming" | "stream" | "binary";
}

export interface SelectedProtocolPolicy {
  readonly protocol: "rest" | "mcp";
  readonly sourcePath: SelectedSourcePath;
  readonly source: SourceProcedureDescriptor;
  readonly authentication: "apiKey" | "optionalApiKey" | "anonymous";
  readonly visibility: "admin" | "authenticated" | "source";
}

export type ProtocolCredential = { readonly kind: "anonymous" } | { readonly kind: "apiKey"; readonly userId: string };

export interface ProtocolRequestBinding<TContext extends BackendContext> {
  readonly context: TContext;
  readonly credential: ProtocolCredential;
}

export interface ProtocolResourceBindings<TContext extends BackendContext> {
  resolveContext(
    resources: BackendRequestResources,
    policy: SelectedProtocolPolicy,
  ): Promise<ProtocolRequestBinding<TContext>>;
  hasSourceBindings(context: TContext, path: SelectedSourcePath): boolean | Promise<boolean>;
}

export function getProtocolAdmissionHold(_requirements: ProtocolAdmissionRequirements): ProtocolHoldReason {
  return "security_unverified";
}

export function checkProtocolAdmission(
  _requirements: ProtocolAdmissionRequirements,
  _bindings: ProtocolResourceBindings<BackendContext> | undefined,
) {
  return unavailableProjection("security_unverified");
}
