import assert from "node:assert/strict";
import { checkServerIdentity } from "node:tls";
import { create as createAxios } from "axios";
import type { AxiosAdapter } from "axios";
import { MockAgent } from "undici/index.js";
import { ZodError } from "zod";

import type { IntegrationKind } from "@homarr/definitions";

import type { IntegrationTestingInput } from "../../base/integration";
import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import { TestConnectionService } from "../../base/test-connection/test-connection-service";
import { createIntegrationRuntime } from "../../runtime/executor";
import type { IntegrationRuntimeRequest } from "../../runtime/executor";
import type { IntegrationAuthority, IntegrationRuntimeResources } from "../../runtime/contracts";
import { withIntegrationTestingAsync } from "../../runtime/testing";
import { ParseError } from "../../../../common/src/errors/parse/parse-error";

const denied = (): never => {
  throw new Error("Unused synthetic Axios method");
};

export const createSyntheticAxios = (adapter: AxiosAdapter = denied): IntegrationTestingInput["axiosInstance"] =>
  createAxios({ adapter });

const immediatelyAsync = async () => undefined;

interface Principal {
  integrationId: string;
  authorities: readonly IntegrationAuthority[];
}

export const createFixture = (fetchAsync: IntegrationTestingInput["fetchAsync"]) => {
  const agents = new Set<MockAgent>();
  let current = true;
  let secretReads = 0;
  let acquired = 0;
  let released = 0;
  let beforeAcquireAsync = immediatelyAsync;
  let axiosInstance = createSyntheticAxios();
  let ownership: "owned" | "shared" = "owned";
  const resourcesFor = (context: IntegrationRuntimeResources["context"]): IntegrationRuntimeResources => ({
    context,
    sessions: {
      createBacking: denied,
      encrypt: denied,
      decrypt: denied,
      fingerprint: denied,
      verifyFingerprint: denied,
      serialize: denied,
      deserialize: denied,
    },
    errorHandlers: [
      {
        handleError: (error, integration) =>
          error instanceof ZodError
            ? new IntegrationParseError(integration, {
                cause: new ParseError("Failed to parse data", { cause: new Error("Invalid synthetic response") }),
              })
            : undefined,
      },
    ],
    transport: {
      runAsync: async (operationContext, operation) => {
        operationContext.signal.throwIfAborted();
        assert(current);
        assert.equal(operationContext.configurationIdentity, "config-1");
        assert.equal(operationContext.trustIdentity, "trust-1");
        return operation();
      },
      acquireTestingAsync: async (_integration, operationContext) => {
        acquired += 1;
        await beforeAcquireAsync();
        const dispatcher = new MockAgent();
        dispatcher.disableNetConnect();
        agents.add(dispatcher);
        const testing: IntegrationTestingInput = {
          dispatcher,
          axiosInstance,
          options: { ca: [], checkServerIdentity },
          fetchAsync: async (url, options) => {
            operationContext.signal.throwIfAborted();
            assert(current);
            return fetchAsync(url, options);
          },
        };
        if (ownership === "shared") return { ownership: "shared", input: testing };
        return {
          ownership: "owned",
          input: testing,
          releaseAsync: async () => {
            released += 1;
            await dispatcher.close();
            agents.delete(dispatcher);
          },
        };
      },
      testConnectionAsync: async (integration, operationContext, operation) => {
        const resources = resourcesFor(operationContext);
        return new TestConnectionService(new URL(integration.url), {
          getTlsOptionsAsync: async () => ({ ca: [], checkServerIdentity }),
          fetchCertificateAsync: async () => {
            throw new Error("No certificate inspection in this synthetic fixture");
          },
        }).handleAsync(() =>
          withIntegrationTestingAsync(integration, operationContext, resources.transport, operation),
        );
      },
    },
  });
  const runtime = createIntegrationRuntime<Principal>({
    policy: {
      authorizeAsync: async (principal, integration, authority) => {
        if (principal.integrationId !== integration.id || !principal.authorities.includes(authority))
          throw new Error("Synthetic access denied");
      },
      resolveSecretsAsync: async (integration) => {
        secretReads += 1;
        if (integration.kind === "frigate")
          return [
            { kind: "username", value: "operator" },
            { kind: "password", value: "synthetic-password" },
          ];
        if (integration.kind === "caddy") return [];
        return [{ kind: "apiKey", value: "synthetic-token" }];
      },
      isCurrentAsync: async (integration) =>
        current && integration.configurationIdentity === "config-1" && integration.trustIdentity === "trust-1",
    },
    createResourcesAsync: async (_input, context) => resourcesFor(context),
    fetchStatsAsync: async (input, signal) => (await import("../index")).fetchStatsAsync(input, signal),
    now: Date.now,
  });
  return {
    runtime,
    request<TKind extends IntegrationKind>(
      kind: TKind,
      authorities: readonly IntegrationAuthority[] = ["query"],
      signal = new AbortController().signal,
    ): IntegrationRuntimeRequest<Principal, TKind> {
      return {
        principal: { integrationId: `synthetic-${kind}`, authorities },
        integration: {
          id: `synthetic-${kind}`,
          kind,
          name: "Synthetic connection",
          url: `https://${kind.toLowerCase()}.invalid/prefix`,
          externalUrl: "https://external.invalid",
          configurationIdentity: "config-1",
          trustIdentity: "trust-1",
        },
        signal,
        deadlineAt: Date.now() + 10_000,
      };
    },
    counts: () => ({ secretReads, acquired, released }),
    invalidate: () => {
      current = false;
    },
    beforeAcquire: (operation: () => Promise<undefined>) => {
      beforeAcquireAsync = operation;
    },
    shared: () => {
      ownership = "shared";
    },
    axios: (adapter: AxiosAdapter) => {
      axiosInstance = createSyntheticAxios(adapter);
    },
    async closeAsync() {
      await runtime.closeAsync();
      await Promise.allSettled([...agents].map((agent) => agent.close()));
    },
  };
};
