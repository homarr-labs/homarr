import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { test } from "node:test";
import { Headers, Response } from "undici";

import { createSessionStore } from "../base/session-store";
import type { SessionStoreResources } from "../base/session-store";
import { minifluxStatsProvider } from "../stats/providers/miniflux";
import type { IntegrationAuthority, IntegrationConfiguration, IntegrationRuntimeResources } from "./contracts";
import { createIntegrationRuntime, IntegrationRuntimeError } from "./executor";
import type { IntegrationRuntimeDependencies, IntegrationRuntimeRequest } from "./executor";
import { createStatsFetchContext } from "./stats-transport";

const configuration: IntegrationConfiguration & { kind: "miniflux" } = {
  id: "synthetic-miniflux",
  kind: "miniflux",
  name: "Synthetic Miniflux",
  url: "https://miniflux.invalid/prefix///",
  externalUrl: "https://feeds.invalid",
  configurationIdentity: "config-1",
  trustIdentity: "trust-1",
};

interface Principal {
  integrationId: string;
  authorities: readonly IntegrationAuthority[];
}

const request = (
  authorities: readonly IntegrationAuthority[] = ["query"],
): IntegrationRuntimeRequest<Principal, "miniflux"> => ({
  principal: { integrationId: configuration.id, authorities },
  integration: { ...configuration },
  signal: new AbortController().signal,
  deadlineAt: Date.now() + 10_000,
});

const sessionResources = () => {
  const key = Buffer.alloc(32, 7);
  const fingerprintKey = createHmac("sha256", key).update("homarr-keyed-fingerprint-v1").digest();
  const fingerprint = (value: string) => createHmac("sha256", fingerprintKey).update(value).digest("hex");
  let value: string | null = null;
  let ttlSeconds: number | undefined;
  let current = true;
  const resources: SessionStoreResources = {
    createBacking: () => ({
      getAsync: async () => value,
      setIfCurrentAsync: async (input, options) => {
        if (!current) return false;
        value = input;
        ttlSeconds = options?.ttlSeconds;
        return true;
      },
      removeIfCurrentAsync: async () => {
        if (!current) return false;
        value = null;
        return true;
      },
    }),
    encrypt: (text) => {
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-cbc", key, iv);
      return `${Buffer.concat([cipher.update(text), cipher.final()]).toString("hex")}.${iv.toString("hex")}`;
    },
    decrypt: (text) => {
      const [data, iv] = text.split(".");
      assert(data && iv);
      const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
      return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString();
    },
    fingerprint,
    verifyFingerprint: (text, expected) => {
      const actual = Buffer.from(fingerprint(text), "hex");
      const encoded = Buffer.from(expected, "hex");
      return actual.length === encoded.length && timingSafeEqual(actual, encoded);
    },
    serialize: JSON.stringify,
    deserialize: (text) => JSON.parse(text),
  };
  return {
    resources,
    stored: () => ({ value, ttlSeconds }),
    invalidate: () => {
      current = false;
    },
    corrupt: () => {
      value = "invalid";
    },
  };
};

const fixture = (fetchStatsAsync: IntegrationRuntimeDependencies<Principal>["fetchStatsAsync"]) => {
  let secretReads = 0;
  let current = true;
  const sessions = sessionResources();
  const dependencies: IntegrationRuntimeDependencies<Principal> = {
    policy: {
      authorizeAsync: async (principal, integration, authority) => {
        if (principal.integrationId !== integration.id || !principal.authorities.includes(authority)) {
          throw new Error("Synthetic access denied");
        }
      },
      resolveSecretsAsync: async () => {
        secretReads += 1;
        return [{ kind: "apiKey", value: "synthetic-private-token" }];
      },
      isCurrentAsync: async (integration) =>
        current &&
        integration.configurationIdentity === configuration.configurationIdentity &&
        integration.trustIdentity === configuration.trustIdentity,
    },
    createResourcesAsync: async (_integration, context): Promise<IntegrationRuntimeResources> => ({
      context,
      sessions: sessions.resources,
      errorHandlers: [],
      transport: {
        runAsync: async (_context, operation) => operation(),
        acquireTestingAsync: async () => {
          throw new Error("Synthetic transport has no sockets");
        },
        testConnectionAsync: async () => {
          throw new Error("Synthetic transport has no sockets");
        },
      },
    }),
    fetchStatsAsync,
    now: Date.now,
  };
  return {
    runtime: createIntegrationRuntime(dependencies),
    secretReads: () => secretReads,
    invalidate: () => {
      current = false;
    },
  };
};

test("native, interact, HTTP and test denial happens before secret resolution", async () => {
  const { runtime, secretReads } = fixture(async () => {
    throw new Error("Must not execute");
  });
  await assert.rejects(runtime.fetchStatsAsync(request([])), IntegrationRuntimeError);
  await assert.rejects(
    runtime.executeNativeAsync(request(["query"]), "interact", async () => undefined),
    IntegrationRuntimeError,
  );
  await assert.rejects(runtime.getHttpAuthenticationAsync(request(["query"])), IntegrationRuntimeError);
  await assert.rejects(runtime.testConnectionAsync(request(["query"])), IntegrationRuntimeError);
  const preAborted = request();
  preAborted.signal = AbortSignal.abort(new Error("synthetic-private-token"));
  await assert.rejects(runtime.fetchStatsAsync(preAborted), { code: "aborted" });
  const changedTrust = request();
  changedTrust.integration.trustIdentity = "changed-trust";
  await assert.rejects(runtime.fetchStatsAsync(changedTrust), { code: "stale" });
  const changedConfiguration = request();
  changedConfiguration.integration.configurationIdentity = "changed-configuration";
  await assert.rejects(runtime.fetchStatsAsync(changedConfiguration), { code: "stale" });
  assert.equal(secretReads(), 0);
  await runtime.closeAsync();
});

test("existing Miniflux provider consumes injected Fetch with prefix, saved auth and unchanged counters", async () => {
  let calls = 0;
  let unread = 3;
  const { runtime } = fixture(async (input, signal) =>
    minifluxStatsProvider.fetchAsync(
      createStatsFetchContext(input, signal, {
        fetchAsync: async (url, init) => {
          calls += 1;
          assert.equal(String(url), "https://miniflux.invalid/prefix/v1/feeds/counters");
          assert.equal(new Headers(init?.headers).get("X-Auth-Token"), "synthetic-private-token");
          assert.equal(init?.redirect, "error");
          assert(init?.signal);
          return new Response(JSON.stringify({ reads: { a: 2, b: 7 }, unreads: { a: 1, b: unread } }));
        },
      }),
    ),
  );
  assert.deepEqual(await runtime.fetchStatsAsync(request()), { read: 9, unread: 4 });
  assert.equal(calls, 1);
  unread = -1;
  await assert.rejects(runtime.fetchStatsAsync(request()), { code: "failed" });
  await runtime.closeAsync();
});

test("abort retains unsettled ownership and late invalidation results are fenced", async () => {
  const started = Promise.withResolvers<void>();
  const work = Promise.withResolvers<Record<string, number>>();
  const { runtime } = fixture(async () => {
    started.resolve();
    return work.promise;
  });
  const controller = new AbortController();
  const input = request();
  input.signal = controller.signal;
  const result = runtime.fetchStatsAsync(input);
  await started.promise;
  controller.abort(new Error("synthetic-private-token"));
  await assert.rejects(result, { code: "aborted" });
  assert.equal(runtime.pendingCount, 1);
  let closed = false;
  const closing = runtime.closeAsync().then(() => {
    closed = true;
  });
  await Promise.resolve();
  assert.equal(closed, false);
  work.resolve({ read: 1 });
  await closing;
  assert.equal(runtime.pendingCount, 0);

  const late = Promise.withResolvers<Record<string, number>>();
  const secondStarted = Promise.withResolvers<void>();
  const second = fixture(async () => {
    secondStarted.resolve();
    return late.promise;
  });
  const staleResult = second.runtime.fetchStatsAsync(request());
  await secondStarted.promise;
  second.invalidate();
  late.resolve({ read: 99 });
  await assert.rejects(staleResult, { code: "stale" });
  await second.runtime.closeAsync();
});

test("credential-bearing transport failures lose messages, causes and custom stacks", async () => {
  const { runtime } = fixture(async (input, signal) =>
    minifluxStatsProvider.fetchAsync(
      createStatsFetchContext(input, signal, {
        fetchAsync: async () => {
          throw new Error("synthetic-private-token", { cause: { password: "synthetic-private-token" } });
        },
      }),
    ),
  );
  await assert.rejects(runtime.fetchStatsAsync(request()), (error: unknown) => {
    assert(error instanceof IntegrationRuntimeError);
    assert.equal(error.cause, undefined);
    assert(!error.stack?.includes("synthetic-private-token"));
    return true;
  });
  await runtime.closeAsync();
});

test("session envelope stays encrypted, keyed to config, provider TTL-owned and fenced", async () => {
  const backing = sessionResources();
  const input = {
    id: configuration.id,
    url: configuration.url,
    decryptedSecrets: [{ kind: "apiKey" as const, value: "synthetic-private-token" }],
  };
  const store = createSessionStore<{ token: string }>(input, backing.resources);
  await store.setAsync({ token: "synthetic-session-token" }, { ttlSeconds: 600 });
  assert.equal(backing.stored().ttlSeconds, 600);
  assert(!backing.stored().value?.includes("synthetic-session-token"));
  assert.deepEqual(await store.getAsync(), { token: "synthetic-session-token" });
  const edited = createSessionStore(
    { ...input, decryptedSecrets: [{ kind: "apiKey", value: "changed" }] },
    backing.resources,
  );
  assert.equal(await edited.getAsync(), null);
  backing.invalidate();
  await store.setAsync({ token: "late-token" });
  await store.clearAsync();
  assert.deepEqual(await store.getAsync(), { token: "synthetic-session-token" });
  backing.corrupt();
  assert.equal(await store.getAsync(), null);
});
