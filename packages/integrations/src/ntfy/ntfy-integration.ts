import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { Integration } from "../base/integration";

export class NTFYIntegration extends Integration {
  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(this.url("/v1/account"), {
          headers: { Authorization: `Bearer ${super.getSecretValue("apiKey")}` },
        });
      },
    });
  }
}
