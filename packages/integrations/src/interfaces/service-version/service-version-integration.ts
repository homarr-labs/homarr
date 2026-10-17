import type { ServiceVersion } from "./service-version-types";

export interface IServiceVersionIntegration {
  getServiceVersionAsync(): Promise<ServiceVersion>;
}
