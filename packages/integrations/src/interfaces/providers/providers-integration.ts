import type { ReleaseResponse, Repository } from "./providers-types";

export interface ProviderIntegration {
  getReleasesAsync(repositories: Repository[]): Promise<ReleaseResponse[]>;
}
