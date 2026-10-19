import type { IServiceVersionIntegration } from "../../interfaces/service-version/service-version-integration";
import type { ServiceVersion } from "../../types";

export class ServiceVersionMockService implements IServiceVersionIntegration {
  public async getServiceVersionAsync(): Promise<ServiceVersion> {
    return await Promise.resolve({ version: "1.0.0" });
  }
}
