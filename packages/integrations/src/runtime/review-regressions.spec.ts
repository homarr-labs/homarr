import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { Response } from "undici";

import { Integration } from "../base/integration";
import { IntegrationRequestError } from "../base/errors/http/integration-request-error";
import { IntegrationResponseError } from "../base/errors/http/integration-response-error";
import { IntegrationParseError } from "../base/errors/parse/integration-parse-error";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { IntegrationInput } from "../base/integration";
import type { IntegrationAuthority, IntegrationRuntimeResources } from "./contracts";
import { withIntegrationRuntimeAsync } from "./context";
import { createIntegrationRuntime } from "./executor";
import type { IntegrationRuntimeDependencies, IntegrationRuntimeRequest } from "./executor";
import { createStatsFetchContext } from "./stats-transport";

const factory = vi.hoisted(() => ({ createAsync: async (): Promise<object> => ({}) }));
vi.mock("../base/creator", () => ({ createIntegrationAsync: () => factory.createAsync() }));
vi.mock("@homarr/definitions", () => ({
  getIntegrationHttpAuthDefinition: () => {
    throw new Error("Auth definition lookup is outside this regression");
  },
}));

interface Principal {
  integrationId: string;
  authorities: Set<IntegrationAuthority>;
}

const fixture = () => {
  const request: IntegrationRuntimeRequest<Principal, "miniflux"> = {
    principal: { integrationId: "synthetic-review", authorities: new Set(["query", "interact", "full"]) },
    integration: {
      id: "synthetic-review",
      kind: "miniflux",
      name: "Synthetic review",
      url: "https://review.invalid/prefix",
      externalUrl: null,
      configurationIdentity: "config-1",
      trustIdentity: "trust-1",
    },
    signal: new AbortController().signal,
    deadlineAt: Date.now() + 10_000,
  };
  const current = { configuration: "config-1", trust: "trust-1" };
  const resources: IntegrationRuntimeResources = {
    context: {
      signal: request.signal,
      deadlineAt: request.deadlineAt,
      configurationIdentity: "config-1",
      trustIdentity: "trust-1",
    },
    sessions: {
      createBacking: () => {
        throw new Error("No session backing in this regression");
      },
      encrypt: () => {
        throw new Error("No crypto in this regression");
      },
      decrypt: () => {
        throw new Error("No crypto in this regression");
      },
      fingerprint: () => {
        throw new Error("No crypto in this regression");
      },
      verifyFingerprint: () => false,
      serialize: JSON.stringify,
      deserialize: (value) => JSON.parse(value),
    },
    errorHandlers: [],
    transport: {
      runAsync: async (_context, operation) => operation(),
      acquireTestingAsync: async () => {
        throw new Error("No sockets in this regression");
      },
      testConnectionAsync: async () => {
        throw new Error("No sockets in this regression");
      },
    },
  };
  const dependencies: IntegrationRuntimeDependencies<Principal> = {
    policy: {
      authorizeAsync: async (principal, integration, authority) => {
        if (principal.integrationId !== integration.id || !principal.authorities.has(authority))
          throw new Error("Access denied");
      },
      resolveSecretsAsync: async () => [{ kind: "apiKey", value: "synthetic-private-token" }],
      isCurrentAsync: async (integration) =>
        integration.configurationIdentity === current.configuration && integration.trustIdentity === current.trust,
    },
    createResourcesAsync: async () => resources,
    fetchStatsAsync: async () => ({ read: 0 }),
    now: Date.now,
  };
  return { request, current, resources, dependencies };
};

test("P1: async resources and factory cannot admit provider work after config, trust, authority or cancellation changes", async () => {
  for (const phase of ["resources", "scope", "factory"] as const) {
    for (const change of ["configuration", "trust", "authority", "abort"] as const) {
      const fixtureState = fixture();
      const started = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const controller = new AbortController();
      fixtureState.request.signal = controller.signal;
      let invocations = 0;
      factory.createAsync = async () => {
        if (phase === "factory") {
          started.resolve();
          await release.promise;
        }
        return {};
      };
      if (phase === "resources")
        fixtureState.dependencies.createResourcesAsync = async () => {
          started.resolve();
          await release.promise;
          return fixtureState.resources;
        };
      if (phase === "scope")
        fixtureState.resources.transport.runAsync = async (_context, operation) => {
          started.resolve();
          await release.promise;
          return operation();
        };
      const runtime = createIntegrationRuntime(fixtureState.dependencies);
      const result = runtime.executeNativeAsync(fixtureState.request, "interact", async () => {
        invocations += 1;
      });
      const rejected = result.then(
        () => false,
        () => true,
      );
      await started.promise;
      if (change === "configuration") fixtureState.current.configuration = "config-2";
      if (change === "trust") fixtureState.current.trust = "trust-2";
      if (change === "authority") fixtureState.request.principal.authorities.delete("interact");
      if (change === "abort") {
        controller.abort(new Error("synthetic-private-token"));
        assert.equal(await rejected, true);
        assert.equal(runtime.pendingCount, 1);
      }
      release.resolve();
      const denied = await rejected;
      await runtime.closeAsync();
      assert.equal(invocations, 0, `${phase}/${change} started a mutation`);
      assert.equal(denied, true);
      assert.equal(runtime.pendingCount, 0);
    }
  }
});

class StatsDiagnosticConsumer extends Integration {
  readAsync(context: ReturnType<typeof createStatsFetchContext>) {
    return context.requestAsync("/stats");
  }
  loginAsync(context: ReturnType<typeof createStatsFetchContext>) {
    return context.requestResponseAsync("/login");
  }
  protected async testingAsync() {
    return { success: true as const };
  }
}

test("P2: sanitized Stats errors retain native certificate, DNS, status and parse diagnostics", async () => {
  const fixtureState = fixture();
  const input: IntegrationInput = {
    ...fixtureState.request.integration,
    decryptedSecrets: [{ kind: "apiKey", value: "synthetic-private-token" }],
  };
  const certificate = new TypeError("synthetic-private-token", {
    cause: Object.assign(new Error("synthetic-private-token"), { code: "ERR_TLS_CERT_ALTNAME_INVALID" }),
  });
  const dns = Object.assign(new Error("synthetic-private-token"), { code: "EAI_AGAIN", isAxiosError: true });
  const status = Object.assign(new Error("synthetic-private-token"), {
    isAxiosError: true,
    response: {
      status: 403,
      data: "synthetic-private-token",
      config: { url: "https://synthetic-private-token.invalid" },
    },
  });
  const syntax = new SyntaxError("synthetic-private-token");
  for (const item of [
    { raw: certificate, operation: "read", expected: "certificate" },
    { raw: certificate, operation: "login", expected: "certificate" },
    { raw: dns, operation: "read", expected: "dns" },
    { raw: status, operation: "read", expected: "status" },
    { raw: syntax, operation: "read", expected: "parse" },
  ]) {
    item.raw.stack = "synthetic-private-token";
    const context = createStatsFetchContext(input, fixtureState.request.signal, {
      fetchAsync: async () => {
        throw item.raw;
      },
    });
    await assert.rejects(
      withIntegrationRuntimeAsync(fixtureState.resources, async () => {
        const consumer = new StatsDiagnosticConsumer(input);
        return item.operation === "login" ? consumer.loginAsync(context) : consumer.readAsync(context);
      }),
      (error: unknown) => {
        if (item.expected === "status") {
          assert(error instanceof IntegrationResponseError);
          assert.equal(error.cause.statusCode, 403);
          assert.equal(TestConnectionError.FromIntegrationError(error).type, "authorization");
        } else if (item.expected === "parse") assert(error instanceof IntegrationParseError);
        else {
          assert(error instanceof IntegrationRequestError);
          assert.equal(error.cause.type, item.expected);
          assert.equal(error.cause.code, item.expected === "dns" ? "EAI_AGAIN" : "ERR_TLS_CERT_ALTNAME_INVALID");
        }
        assert(error instanceof Error);
        assert(!JSON.stringify(error).includes("synthetic-private-token"));
        assert(!error.stack?.includes("synthetic-private-token"));
        assert(error.cause instanceof Error);
        assert(!error.cause.message.includes("synthetic-private-token"));
        assert(!error.cause.stack?.includes("synthetic-private-token"));
        return true;
      },
    );
  }
  const httpContext = createStatsFetchContext(input, fixtureState.request.signal, {
    fetchAsync: async () => new Response("synthetic-private-token", { status: 401 }),
  });
  await assert.rejects(
    withIntegrationRuntimeAsync(fixtureState.resources, () =>
      new StatsDiagnosticConsumer(input).readAsync(httpContext),
    ),
    (error: unknown) =>
      error instanceof IntegrationResponseError &&
      error.cause.statusCode === 401 &&
      TestConnectionError.FromIntegrationError(error).type === "authorization",
  );
  const unavailableContext = createStatsFetchContext(input, fixtureState.request.signal, {
    fetchAsync: async () => new Response("synthetic-private-token", { status: 503 }),
  });
  await assert.rejects(
    withIntegrationRuntimeAsync(fixtureState.resources, () =>
      new StatsDiagnosticConsumer(input).readAsync(unavailableContext),
    ),
    (error: unknown) =>
      error instanceof IntegrationResponseError &&
      error.cause.statusCode === 503 &&
      TestConnectionError.FromIntegrationError(error).type === "statusCode",
  );
});
