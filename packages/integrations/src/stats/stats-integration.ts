import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";

import { Integration } from "../base/integration";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import { resolveDeclaredHttpAuthentication } from "../http-auth";
import { getIntegrationRuntimeResources, requireIntegrationRuntimeResources } from "../runtime/context";
import { createStatsFetchContext } from "../runtime/stats-transport";
import { withIntegrationTestingAsync } from "../runtime/testing";
import type { StatsProvider } from "./types";
import type { StatsFetchContext } from "./types";

export class StatsIntegration extends Integration {
  constructor(
    input: IntegrationInput,
    private readonly provider: StatsProvider,
  ) {
    super(input);
  }

  public override async getHttpAuthenticationAsync() {
    getIntegrationRuntimeResources()?.context.signal.throwIfAborted();
    if (this.integration.kind && getIntegrationHttpAuthDefinition(this.integration.kind).type !== "adapter")
      return await super.getHttpAuthenticationAsync();
    const getAuthenticationAsync = this.provider.getHttpAuthenticationAsync;
    if (getAuthenticationAsync) {
      return await this.withContextAsync(AbortSignal.timeout(15_000), undefined, undefined, (context) =>
        getAuthenticationAsync.call(this.provider, context),
      );
    }
    if (!this.provider.getHttpAuthentication) return await super.getHttpAuthenticationAsync();
    return this.provider.getHttpAuthentication({
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
    });
  }

  async getStatsAsync(signal = AbortSignal.timeout(30_000), testing?: IntegrationTestingInput) {
    return await this.withContextAsync(
      signal,
      testing,
      () => {
        const definition = this.integration.kind ? getIntegrationHttpAuthDefinition(this.integration.kind) : undefined;
        return definition && definition.type !== "adapter"
          ? resolveDeclaredHttpAuthentication(this.integration, definition)
          : undefined;
      },
      (context) => this.provider.fetchAsync(context),
    );
  }

  private async withContextAsync<T>(
    signal: AbortSignal,
    testing: IntegrationTestingInput | undefined,
    authentication: (() => IntegrationHttpAuthentication | undefined) | undefined,
    operation: (context: StatsFetchContext) => Promise<T>,
  ) {
    const resources = getIntegrationRuntimeResources();
    const operationSignal = resources ? AbortSignal.any([signal, resources.context.signal]) : signal;
    operationSignal.throwIfAborted();
    const executeAsync = async (transport: IntegrationTestingInput) => {
      operationSignal.throwIfAborted();
      const invokeAsync = async () => {
        operationSignal.throwIfAborted();
        return await operation(
          createStatsFetchContext(this.integration, operationSignal, transport, {
            authentication: authentication?.(),
            transport: this.provider.transport,
          }),
        );
      };
      return resources
        ? await resources.transport.runAsync({ ...resources.context, signal: operationSignal }, invokeAsync)
        : await invokeAsync();
    };
    if (testing) return await executeAsync(testing);
    const runtime = resources ?? requireIntegrationRuntimeResources();
    return await withIntegrationTestingAsync(
      this.integration,
      { ...runtime.context, signal: operationSignal },
      runtime.transport,
      executeAsync,
    );
  }

  protected async testingAsync(input: IntegrationTestingInput) {
    await this.getStatsAsync(AbortSignal.timeout(30_000), input);
    return { success: true as const };
  }
}
