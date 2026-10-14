import { requireIntegrationRuntimeResources } from "../runtime/context";
import type { IntegrationSecret } from "./types";

const sessionEnvelopeType = "homarr-integration-session";
const sessionEnvelopeVersion = 1;

export interface SessionStoreIntegration {
  id: string;
  url: string;
  decryptedSecrets: readonly IntegrationSecret[];
}

export interface SessionStoreBacking {
  getAsync: () => Promise<string | null>;
  setIfCurrentAsync: (value: string, options?: { ttlSeconds?: number }) => Promise<boolean>;
  removeIfCurrentAsync: () => Promise<boolean>;
}

export interface SessionStoreResources {
  createBacking: (
    integration: Pick<SessionStoreIntegration, "id" | "url">,
    configurationFingerprint: string,
  ) => SessionStoreBacking;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
  fingerprint: (value: string) => string;
  verifyFingerprint: (value: string, fingerprint: string) => boolean;
  serialize: (value: unknown) => string;
  deserialize: (value: string) => unknown;
  reportFailure?: (operation: "read" | "write", integrationId: string) => void;
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

export const createSessionStore = <TValue>(
  integration: SessionStoreIntegration,
  resources: SessionStoreResources = requireIntegrationRuntimeResources().sessions,
) => {
  const serializedConfiguration = serializeSessionConfiguration(integration);
  const configurationFingerprint = resources.fingerprint(serializedConfiguration);
  const channel = resources.createBacking({ id: integration.id, url: integration.url }, configurationFingerprint);

  return {
    async getAsync() {
      const value = await channel.getAsync();
      if (!value) return null;
      try {
        const envelope = resources.deserialize(resources.decrypt(value));
        if (!isSessionEnvelope<TValue>(envelope)) {
          return null;
        }
        if (!resources.verifyFingerprint(serializedConfiguration, envelope.configurationFingerprint)) {
          return null;
        }
        return envelope.value;
      } catch {
        resources.reportFailure?.("read", integration.id);
        return null;
      }
    },
    async setAsync(value: TValue, options?: { ttlSeconds?: number }) {
      try {
        const envelope: SessionEnvelope<TValue> = {
          type: sessionEnvelopeType,
          version: sessionEnvelopeVersion,
          configurationFingerprint,
          value,
        };
        const saved = await channel.setIfCurrentAsync(resources.encrypt(resources.serialize(envelope)), options);
        if (!saved) resources.reportFailure?.("write", integration.id);
      } catch {
        resources.reportFailure?.("write", integration.id);
      }
    },
    async clearAsync() {
      await channel.removeIfCurrentAsync();
    },
  };
};

export type SessionStore<TValue> = ReturnType<typeof createSessionStore<TValue>>;
