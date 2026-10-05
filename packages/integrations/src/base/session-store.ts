import superjson from "superjson";

import { createKeyedFingerprint, decryptSecret, encryptSecret, verifyKeyedFingerprint } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createGetSetChannel, getIntegrationSessionStoreKey } from "@homarr/redis";

import type { IntegrationSecret } from "./types";

const logger = createLogger({ module: "sessionStore" });
const sessionEnvelopeType = "homarr-integration-session";
const sessionEnvelopeVersion = 1;

interface SessionStoreIntegration {
  id: string;
  url: string;
  decryptedSecrets: readonly IntegrationSecret[];
}

interface SessionEnvelope<TValue> {
  type: typeof sessionEnvelopeType;
  version: typeof sessionEnvelopeVersion;
  configurationFingerprint: string;
  value: TValue;
}

const compareStrings = (left: string, right: string) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const serializeSessionConfiguration = (integration: SessionStoreIntegration) => {
  const secrets = integration.decryptedSecrets
    .map(({ kind, value }) => [kind, value] as const)
    .toSorted(([leftKind, leftValue], [rightKind, rightValue]) => {
      const kindComparison = compareStrings(leftKind, rightKind);
      if (kindComparison !== 0) return kindComparison;
      return compareStrings(leftValue, rightValue);
    });

  return JSON.stringify({ integrationId: integration.id, url: integration.url, secrets });
};

const isSessionEnvelope = <TValue>(value: unknown): value is SessionEnvelope<TValue> => {
  if (typeof value !== "object" || value === null) return false;
  if (!("value" in value)) return false;

  return (
    "type" in value &&
    value.type === sessionEnvelopeType &&
    "version" in value &&
    value.version === sessionEnvelopeVersion &&
    "configurationFingerprint" in value &&
    typeof value.configurationFingerprint === "string"
  );
};

export const createSessionStore = <TValue>(integration: SessionStoreIntegration) => {
  const channelName = getIntegrationSessionStoreKey(integration.id);
  const channel = createGetSetChannel<`${string}.${string}`>(channelName);
  const serializedConfiguration = serializeSessionConfiguration(integration);
  const configurationFingerprint = createKeyedFingerprint(serializedConfiguration);

  return {
    async getAsync() {
      logger.debug("Getting session from store", { store: channelName });
      const value = await channel.getAsync();
      if (!value) return null;
      try {
        const envelope = superjson.parse<unknown>(decryptSecret(value));
        if (!isSessionEnvelope<TValue>(envelope)) {
          logger.debug("Ignoring legacy or unsupported session", { store: channelName });
          return null;
        }
        if (!verifyKeyedFingerprint(serializedConfiguration, envelope.configurationFingerprint)) {
          logger.debug("Ignoring session for a different integration configuration", { store: channelName });
          return null;
        }
        return envelope.value;
      } catch (error) {
        logger.warn("Failed to load session", { store: channelName, error });
        return null;
      }
    },
    /**
     * @param value session to store
     * @param options pass `ttlSeconds` when the credential has a known lifetime, so a stored
     * session can never outlive the token it holds
     */
    async setAsync(value: TValue, options?: { ttlSeconds?: number }) {
      logger.debug("Updating session in store", { store: channelName, ttlSeconds: options?.ttlSeconds });
      try {
        const envelope: SessionEnvelope<TValue> = {
          type: sessionEnvelopeType,
          version: sessionEnvelopeVersion,
          configurationFingerprint,
          value,
        };
        await channel.setAsync(encryptSecret(superjson.stringify(envelope)), options);
      } catch (error) {
        logger.error(new ErrorWithMetadata("Failed to save session", { store: channelName }, { cause: error }));
      }
    },
    async clearAsync() {
      logger.debug("Cleared session in store", { store: channelName });
      await channel.removeAsync();
    },
  };
};

export type SessionStore<TValue> = ReturnType<typeof createSessionStore<TValue>>;
