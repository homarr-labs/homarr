import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationSecret } from "./types";

export abstract class Integration {
  constructor(
    protected integration: {
      id: string;
      name: string;
      url: string;
      decryptedSecrets: IntegrationSecret[];
    },
  ) {}

  protected getSecretValue(kind: IntegrationSecretKind) {
    const secret = this.integration.decryptedSecrets.find((secret) => secret.kind === kind);
    if (!secret) {
      throw new Error(`No secret of kind ${kind} was found`);
    }
    return secret.value;
  }

  public abstract testConnectionAsync(): Promise<TestConnectionResult>;
}

export type TestConnectionResult =
  | {
      success: false;
      error: {
        title: string;
        message: string;
      };
    }
  | {
      success: true;
    };
