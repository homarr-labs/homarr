import type { IntegrationKind } from "@homarr/definitions";

export type IntegrationBindingHold =
  | "saved-sql-snapshot"
  | "credential-codec"
  | "trusted-material"
  | "native-authority"
  | "native-class-resources"
  | "native-stats-projection"
  | "session-commit-fence"
  | "session-serialization"
  | "cache-generations"
  | "media-request-list-cache"
  | "media-request-stats-cache"
  | "certificate-diagnostics"
  | "axios-proxy-resources"
  | "closed"
  | "stale";

export class IntegrationBindingError extends Error {
  constructor(
    public readonly resource: IntegrationBindingHold,
    public readonly integrationKind?: IntegrationKind,
  ) {
    super(`Integration binding unavailable: ${resource}`);
    this.name = "IntegrationBindingError";
  }
}

export type IntegrationProducer<T> =
  | { readonly kind: "unbound" }
  | { readonly kind: "candidate"; readonly resources: T };

export const requireIntegrationProducer = <T>(
  producer: IntegrationProducer<T>,
  resource: IntegrationBindingHold,
): T => {
  if (producer.kind === "unbound") throw new IntegrationBindingError(resource);
  return producer.resources;
};
