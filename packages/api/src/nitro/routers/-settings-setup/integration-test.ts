import { createHash } from "node:crypto";
import { ORPCError } from "@orpc/server";

import { getAllSecretKindOptions, getOptionalSecretKinds } from "@homarr/definitions";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import type { z } from "zod/v4";
import type { onboardingIntegrationDraftSchema } from "@homarr/validation/onboarding";

export type IntegrationDraft = z.infer<typeof onboardingIntegrationDraftSchema>;
export interface SetupIntegrationClientResources {
  info(
    message: string,
    metadata: { integrationName: string; integrationKind: IntegrationKind; integrationUrl: string },
  ): void;
  createIntegration(input: {
    id: string;
    name: string;
    url: string;
    kind: IntegrationKind;
    externalUrl: null;
    decryptedSecrets: { kind: IntegrationSecretKind; value: string }[];
  }): Promise<{ testConnectionAsync(): Promise<{ success: boolean }> }>;
}

export function stableOnboardingId(prefix: "app" | "integration", sourceId: string) {
  return `onboarding_${prefix}_${createHash("sha256").update(sourceId).digest("hex").slice(0, 32)}`;
}

export async function testSetupIntegration(resources: SetupIntegrationClientResources, input: IntegrationDraft) {
  const metadata = { integrationName: input.name, integrationKind: input.kind, integrationUrl: input.url };
  resources.info("Testing connection", metadata);
  const secrets = input.secrets.filter(
    (secret): secret is { kind: IntegrationSecretKind; value: string } => secret.value !== null,
  );
  const matchingOptions = getAllSecretKindOptions(input.kind).filter((kinds) =>
    kinds.every((kind) => secrets.some((secret) => secret.kind === kind)),
  );
  if (matchingOptions.length === 0)
    throw new ORPCError("BAD_REQUEST", { message: "No secret defined for this integration" });
  const selected =
    matchingOptions.length >= 2 && matchingOptions.some((kinds) => kinds.length === 0)
      ? (matchingOptions.find((kinds) => kinds.length >= 1) ?? matchingOptions[0])
      : matchingOptions[0];
  if (!selected) throw new ORPCError("BAD_REQUEST", { message: "No secret defined for this integration" });
  const optional = getOptionalSecretKinds(input.kind).filter(
    (kind) => !selected.includes(kind) && secrets.some((secret) => secret.kind === kind),
  );
  const decryptedSecrets = [...selected, ...optional].map((kind) => {
    const secret = secrets.find((candidate) => candidate.kind === kind);
    if (!secret) throw new ORPCError("BAD_REQUEST", { message: "No secret defined for this integration" });
    return secret;
  });
  const instance = await resources.createIntegration({
    id: stableOnboardingId("integration", input.sourceId),
    name: input.name,
    url: input.url,
    kind: input.kind,
    externalUrl: null,
    decryptedSecrets,
  });
  const result = await instance.testConnectionAsync();
  if (result.success) resources.info("Tested connection successfully", metadata);
  return { success: result.success };
}
