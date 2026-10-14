import {
  readProductionOnboardingPublication,
  settleProductionOnboardingPublicationAsync,
} from "@homarr/auth/nitro/production-sessions";
import type {
  ProductionSqlSessionIssuer,
  ProductionOnboardingPublicationResult,
} from "@homarr/auth/nitro/production-sessions";
import type { OnboardingRpcRequestResult } from "@homarr/api/nitro/assembly/onboarding-wire";
import type { FetchContribution } from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";

import type { OnboardingPublicationHandle, OnboardingWireRequestOwner } from "./contracts";

export function createOnboardingRpcRoutes(owner: OnboardingWireRequestOwner): readonly FetchContribution[] {
  return Object.freeze([
    Object.freeze<FetchContribution>({
      phase: "rpc",
      path: "/rpc/onboard/nextStep",
      descendants: false,
      access: { kind: "public" },
      handle(context) {
        if (context.request.method !== "POST")
          return Promise.resolve({
            kind: "response",
            response: new Response(null, { status: 405, headers: { allow: "POST" } }),
          });
        return owner.executeRpcAsync(context, "nextStep");
      },
    }),
    Object.freeze<FetchContribution>({
      phase: "rpc",
      path: "/rpc/user/initUser",
      descendants: false,
      access: { kind: "public" },
      handle(context) {
        if (context.request.method !== "POST")
          return Promise.resolve({
            kind: "response",
            response: new Response(null, { status: 405, headers: { allow: "POST" } }),
          });
        return owner.executeRpcAsync(context, "initUser");
      },
    }),
    Object.freeze<FetchContribution>({
      phase: "rpc",
      path: "/rpc/group/createInitialExternalGroup",
      descendants: false,
      access: { kind: "public" },
      handle(context) {
        if (context.request.method !== "POST")
          return Promise.resolve({
            kind: "response",
            response: new Response(null, { status: 405, headers: { allow: "POST" } }),
          });
        return owner.executeRpcAsync(context, "initialExternalGroup");
      },
    }),
  ]);
}

function onboardingResponseHead(response: Response): string {
  const fields: [string, string][] = [];
  let bytes = 0;
  response.headers.forEach((value, key) => {
    bytes += Buffer.byteLength(key + value, "utf8");
    if (bytes > 65_536) throw new Error("MAIN_ONBOARDING_RESPONSE_HEADERS_UNAVAILABLE");
    fields.push([key, value]);
  });
  return JSON.stringify({ status: response.status, statusText: response.statusText, fields });
}

export function createOnboardingWirePublication(
  issuer: ProductionSqlSessionIssuer,
  context: RequestContext,
  result: OnboardingRpcRequestResult,
) {
  const finite = readProductionOnboardingPublication(issuer, result.publication, context.request, result.response);
  let body: BodyInit | null = finite.body;
  if (result.response.body === null) body = null;
  const response = new Response(body, {
    status: result.response.status,
    statusText: result.response.statusText,
    headers: result.response.headers,
  });
  const head = onboardingResponseHead(response);
  const completion = Promise.withResolvers<ProductionOnboardingPublicationResult>();
  void completion.promise.catch(() => undefined);
  let association:
    | {
        readonly issuer: WeakRef<ProductionSqlSessionIssuer>;
        readonly context: WeakRef<RequestContext>;
        readonly request: Request;
        readonly source: Response;
        readonly response: Response;
        readonly publication: OnboardingRpcRequestResult["publication"];
      }
    | undefined = {
    issuer: new WeakRef(issuer),
    context: new WeakRef(context),
    request: context.request,
    source: result.response,
    response,
    publication: result.publication,
  };
  let terminal: Promise<ProductionOnboardingPublicationResult> | undefined;
  let claimed = false;
  const read = () => {
    const owned = association;
    const currentIssuer = owned?.issuer.deref();
    if (!owned || !currentIssuer || terminal || onboardingResponseHead(owned.response) !== head)
      throw new Error("MAIN_ONBOARDING_PUBLICATION_UNAVAILABLE");
    return readProductionOnboardingPublication(currentIssuer, owned.publication, owned.request, owned.source);
  };
  const settle = (
    decision: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown },
  ) => {
    if (terminal) return terminal;
    const owned = association;
    const currentIssuer = owned?.issuer.deref();
    if (!owned || !currentIssuer) throw new Error("MAIN_ONBOARDING_PUBLICATION_UNAVAILABLE");
    let sourcePrimary = finite.primary;
    if (decision.kind === "published") sourcePrimary = read().primary;
    const finished = Promise.withResolvers<ProductionOnboardingPublicationResult>();
    terminal = finished.promise;
    void finished.promise.catch(() => undefined);
    const task = Promise.resolve().then(async () => {
      try {
        const forwarded = settleProductionOnboardingPublicationAsync(
          currentIssuer,
          owned.publication,
          owned.request,
          owned.source,
          decision,
        );
        return await forwarded;
      } catch (firstForwardingError: unknown) {
        let terminalFailure = firstForwardingError;
        if (decision.kind === "published") {
          try {
            const abandoned = settleProductionOnboardingPublicationAsync(
              currentIssuer,
              owned.publication,
              owned.request,
              owned.source,
              { kind: "abandoned", cause: firstForwardingError },
            );
            return await abandoned;
          } catch (fallbackError: unknown) {
            terminalFailure = fallbackError;
          }
        }
        const failures: unknown[] = [];
        if (sourcePrimary.kind === "failed") failures.push(sourcePrimary.error);
        if (!failures.some((failure) => Object.is(failure, firstForwardingError))) failures.push(firstForwardingError);
        if (!failures.some((failure) => Object.is(failure, terminalFailure))) failures.push(terminalFailure);
        if (failures.length === 1) throw failures[0];
        throw new AggregateError(failures, "MAIN_ONBOARDING_PUBLICATION_FORWARDING_FAILED", { cause: failures[0] });
      }
    });
    const forwarding = task.then(
      (value) => {
        association = undefined;
        completion.resolve(value);
        finished.resolve(value);
      },
      (error: unknown) => {
        association = undefined;
        completion.reject(error);
        finished.reject(error);
      },
    );
    void forwarding.catch((error: unknown) => {
      association = undefined;
      completion.reject(error);
      finished.reject(error);
    });
    return finished.promise;
  };
  const handle: OnboardingPublicationHandle = Object.freeze({
    read,
    finishAsync: () => settle({ kind: "published" }),
    abandonAsync: (cause: unknown) => settle({ kind: "abandoned", cause }),
  });
  return Object.freeze({
    response,
    completion: completion.promise,
    claim(original: RequestContext, returned: Response) {
      if (
        !association ||
        claimed ||
        association.context.deref() !== original ||
        association.request !== original.request ||
        association.response !== returned
      )
        throw new Error("MAIN_ONBOARDING_PUBLICATION_FOREIGN");
      read();
      claimed = true;
      return handle;
    },
    abandonAsync(original: RequestContext, returned: Response, cause: unknown) {
      if (
        !association ||
        association.context.deref() !== original ||
        association.request !== original.request ||
        association.response !== returned
      )
        throw new Error("MAIN_ONBOARDING_PUBLICATION_FOREIGN");
      return handle.abandonAsync(cause);
    },
    stop: handle.abandonAsync,
  });
}
