import type { AtomicStateBacking, StateCondition, StateOperation } from "@homarr/redis/state";

import type { SessionStoreResources } from "../base/session-store";
import type { IntegrationExecutionContext } from "../runtime/contracts";
import type { IntegrationCredentialCodec } from "./configuration";
import { IntegrationBindingError, requireIntegrationProducer } from "./errors";
import type { IntegrationProducer } from "./errors";
import type { IntegrationBindingLifetime } from "./lifetime";

export interface IntegrationSessionFence {
  readonly integrationId: string;
  readonly configurationIdentity: string;
  readonly trustIdentity: string;
  readonly conditions: readonly StateCondition[];
  assertCurrentAsync(signal: AbortSignal): Promise<void>;
}

export interface IntegrationSessionResources {
  readonly codec: IntegrationProducer<IntegrationCredentialCodec>;
  readonly serialization: IntegrationProducer<Pick<SessionStoreResources, "serialize" | "deserialize">>;
  readonly backing: IntegrationProducer<{
    readonly state: AtomicStateBacking;
    acquireFenceAsync(
      integration: { readonly id: string; readonly url: string },
      context: IntegrationExecutionContext,
    ): Promise<IntegrationSessionFence>;
  }>;
  readonly reportFailure?: SessionStoreResources["reportFailure"];
}

export const createIntegrationSessionBindings = (
  resources: IntegrationSessionResources,
  context: IntegrationExecutionContext,
  lifetime: IntegrationBindingLifetime,
): SessionStoreResources => {
  const codec = () => requireIntegrationProducer(resources.codec, "credential-codec");
  const serialization = () => requireIntegrationProducer(resources.serialization, "session-serialization");
  const signal = AbortSignal.any([context.signal, lifetime.signal]);
  const operation: StateOperation = { signal, deadlineAt: context.deadlineAt };

  return {
    encrypt: (value) => codec().encryptSecret(value),
    decrypt: (value) => {
      const separator = value.indexOf(".");
      if (separator < 1 || separator === value.length - 1) throw new IntegrationBindingError("credential-codec");
      return codec().decryptSecret(`${value.slice(0, separator)}.${value.slice(separator + 1)}`);
    },
    fingerprint: (value) => codec().fingerprint(value),
    verifyFingerprint: (value, fingerprint) => codec().verifyFingerprint(value, fingerprint),
    serialize: (value) => serialization().serialize(value),
    deserialize: (value) => serialization().deserialize(value),
    reportFailure: resources.reportFailure,
    createBacking(integration, configurationFingerprint) {
      if (!configurationFingerprint) throw new IntegrationBindingError("session-commit-fence");
      const producer = requireIntegrationProducer(resources.backing, "session-commit-fence");
      const key = `session-store:${integration.id}`;
      let captured: Promise<IntegrationSessionFence> | undefined;
      let observed: string | null | undefined;

      const getFenceAsync = async () => {
        signal.throwIfAborted();
        captured ??= producer.acquireFenceAsync(integration, { ...context, signal });
        const fence = await captured;
        if (
          fence.integrationId !== integration.id ||
          fence.configurationIdentity !== context.configurationIdentity ||
          fence.trustIdentity !== context.trustIdentity ||
          fence.conditions.length === 0
        )
          throw new IntegrationBindingError("session-commit-fence");
        await fence.assertCurrentAsync(signal);
        signal.throwIfAborted();
        return fence;
      };

      const readAsync = async () => {
        const fence = await getFenceAsync();
        const snapshot = await producer.state.readAsync(
          [...new Set([key, ...fence.conditions.map((condition) => condition.key)])],
          operation,
        );
        if (!fence.conditions.every((condition) => (snapshot.values[condition.key] ?? null) === condition.equals)) {
          throw new IntegrationBindingError("stale");
        }
        await fence.assertCurrentAsync(signal);
        signal.throwIfAborted();
        observed = snapshot.values[key] ?? null;
        return observed;
      };

      const mutateAsync = async (value: string | null, ttlSeconds?: number) => {
        if (
          ttlSeconds !== undefined &&
          (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds * 1000 > Number.MAX_SAFE_INTEGER)
        ) {
          throw new IntegrationBindingError("session-commit-fence");
        }
        const fence = await getFenceAsync();
        if (observed === undefined) await readAsync();
        const result = await producer.state.mutateAsync(
          {
            conditions: [...fence.conditions, { key, equals: observed ?? null }],
            writes: [
              value === null
                ? { kind: "delete", key }
                : { kind: "set", key, value, ttlMs: ttlSeconds === undefined ? null : ttlSeconds * 1000 },
            ],
            readKeys: [key],
          },
          operation,
        );
        signal.throwIfAborted();
        if (result.applied) observed = value;
        return result.applied;
      };

      return {
        getAsync: () => lifetime.trackAsync(readAsync),
        setIfCurrentAsync: (value, options) => lifetime.trackAsync(() => mutateAsync(value, options?.ttlSeconds)),
        removeIfCurrentAsync: () => lifetime.trackAsync(() => mutateAsync(null)),
      };
    },
  };
};
