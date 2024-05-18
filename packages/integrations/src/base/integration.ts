import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationSecret } from "./types";

export abstract class Integration {
  constructor(
    protected url: string,
    protected secrets: IntegrationSecret[],
  ) {}

  protected getSecretValue(kind: IntegrationSecretKind) {
    const secret = this.secrets.find((secret) => secret.kind === kind);
    if (!secret) {
      throw new Error(`Secret with kind ${kind} not found`);
    }
    return secret.value;
  }
}
