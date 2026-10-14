import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterUtilsPlugin } from "@orpc/tanstack-query";

import type { OnboardingWriteClient } from "@homarr/api/nitro/assembly/onboarding-writes";

import { assertOnboardingCsrfOwner } from "../features/onboarding/claim";
import type { OnboardingCsrfOwner, OnboardingPostCall, OnboardingPostPath } from "../features/onboarding/claim";
import { resolveBrowserRpcEndpoint } from "./rpc-link";

export type { OnboardingWriteClient } from "@homarr/api/nitro/assembly/onboarding-writes";

function writePath(path: readonly string[]): OnboardingPostPath {
  if (path.length === 2) {
    if (path[0] === "onboard" && path[1] === "nextStep") return "/rpc/onboard/nextStep";
    if (path[0] === "user" && path[1] === "initUser") return "/rpc/user/initUser";
    if (path[0] === "group" && path[1] === "createInitialExternalGroup") return "/rpc/group/createInitialExternalGroup";
  }
  throw new Error("Onboarding write path is unavailable");
}

export function createOnboardingWriteBrowserClient(
  endpoint: string | URL,
  owner: OnboardingCsrfOwner,
): OnboardingWriteClient {
  const url = resolveBrowserRpcEndpoint(endpoint);
  assertOnboardingCsrfOwner(owner);
  if (url.pathname !== "/rpc" || url.origin !== owner.origin) {
    throw new Error("Onboarding writes require the owning same-origin RPC endpoint");
  }
  const calls = new WeakMap<object, OnboardingPostCall>();
  const link = new RPCLink<Record<never, never>>({
    url: "/rpc",
    method: "POST",
    interceptors: [
      ({ next, ...options }) =>
        owner.runPostAsync(writePath(options.path), options.signal, async (call) => {
          const context = Object.freeze({});
          calls.set(context, call);
          try {
            return await next({ ...options, context, signal: call.signal });
          } finally {
            calls.delete(context);
          }
        }),
    ],
    headers: (options, path) => {
      writePath(path);
      const call = calls.get(options.context);
      if (!call || options.signal !== call.signal) throw new Error("Onboarding headers require an owned SDK call");
      return call.headersAsync();
    },
    fetch: (request, init, options, path) => {
      const expectedPath = writePath(path);
      const call = calls.get(options.context);
      const target = resolveBrowserRpcEndpoint(request);
      if (!call || options.signal !== call.signal || target.origin !== url.origin || target.pathname !== expectedPath) {
        throw new Error("Onboarding fetch requires the same owned SDK call");
      }
      return call.fetchAsync(target.href, init);
    },
  });
  return createORPCClient<OnboardingWriteClient>(link);
}

export function createOnboardingWriteQueryUtils(client: OnboardingWriteClient) {
  const policy: RouterUtilsPlugin<OnboardingWriteClient> = {
    name: "homarr-onboarding-write-options",
    initProcedureOptions: (_path, options) => ({
      ...options,
      mutationKey: (optionsIn) => {
        if (optionsIn.mutationKey !== undefined) throw new Error("Onboarding writes require generated mutation keys");
        return optionsIn;
      },
      mutationOptions: (optionsIn) => ({ ...optionsIn, retry: false }),
    }),
  };
  const orpc = createTanstackQueryUtils(client, { prefix: "homarr:onboarding-fixed-writes", plugins: [policy] });
  return Object.freeze({
    key: () => orpc.key(),
    onboard: Object.freeze({
      nextStep: Object.freeze({
        mutationOptions: orpc.onboard.nextStep.mutationOptions,
        mutationKey: orpc.onboard.nextStep.mutationKey,
      }),
    }),
    user: Object.freeze({
      initUser: Object.freeze({
        mutationOptions: orpc.user.initUser.mutationOptions,
        mutationKey: orpc.user.initUser.mutationKey,
      }),
    }),
    group: Object.freeze({
      createInitialExternalGroup: Object.freeze({
        mutationOptions: orpc.group.createInitialExternalGroup.mutationOptions,
        mutationKey: orpc.group.createInitialExternalGroup.mutationKey,
      }),
    }),
  });
}
