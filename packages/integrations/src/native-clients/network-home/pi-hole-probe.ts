import type { IntegrationInput } from "../../base/integration";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";
import type { TestingResult } from "../../base/test-connection/test-connection-service";

class PiHoleVersionProbe extends NetworkHomeProtocol {
  async detectAsync(): Promise<"v5" | "v6"> {
    try {
      return await this.runAsync<"v5" | "v6">((http) =>
        http.responseAsync<"v5" | "v6">(this.url("/api/info/login"), {}, async (response) =>
          response.status === 404 ? "v5" : "v6",
        ),
      );
    } catch (error) {
      this.rethrowProtectedFailure(error);
      return "v6";
    }
  }

  protected async testingAsync(_http: NetworkHomeHttpOperation): Promise<TestingResult> {
    throw new Error("Pi-hole version detection is not a connection test");
  }
}

export const probePiHoleVersionAsync = (input: IntegrationInput, resources: IntegrationRuntimeResources) =>
  new PiHoleVersionProbe(input, resources).detectAsync();
