import type { RequestContext, RequestServices, AccessRequirement } from "./request";

export const dispatchPhases = ["auth", "rpc", "api", "stream", "binary", "asset"] as const;

export type DispatchPhase = (typeof dispatchPhases)[number];

export type FetchOutcome = { readonly kind: "pass" } | { readonly kind: "response"; readonly response: Response };

export interface FetchContribution {
  readonly phase: DispatchPhase;
  readonly path: `/${string}`;
  readonly descendants?: boolean;
  readonly access: AccessRequirement;
  handle(context: RequestContext): Promise<FetchOutcome>;
}

export interface RuntimeContribution {
  readonly id: string;
  readonly routes?: readonly FetchContribution[];
  ready?(signal: AbortSignal): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export interface ApplicationOptions {
  readonly contributions?: readonly RuntimeContribution[];
  readonly services?: Partial<RequestServices>;
  render?(context: RequestContext): Promise<Response>;
  reportError?(error: unknown, requestId: string): void;
}

export interface Application {
  ready(): Promise<void>;
  fetch(request: Request): Promise<Response>;
  dispose(): Promise<void>;
}
