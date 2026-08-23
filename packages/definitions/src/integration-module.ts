import type { IntegrationCategory, IntegrationSecretKind } from "./integration";

export interface IntegrationModuleDocumentation {
  slug: string;
  sourceDirectory: string;
}

export interface IntegrationModuleDockerMetadata {
  aliases?: readonly string[];
  discoverable?: boolean;
}

export interface IntegrationModuleOnboardingMetadata {
  featuredOrder?: number;
  hidden?: boolean;
}

export type IntegrationModuleCreatorEntry =
  | {
      type: "constructor";
      module: string;
      exportName: string;
    }
  | {
      type: "factory";
      module: string;
      exportName: string;
    };

/**
 * Pure, server-safe authoring contract for a vertical integration module.
 *
 * Runtime entry points are strings so reading metadata never imports an
 * integration implementation or its transitive server dependencies.
 */
export interface IntegrationModuleDefinition {
  kind: string;
  name: string;
  iconUrl: string;
  secretKinds: readonly [readonly IntegrationSecretKind[], ...(readonly IntegrationSecretKind[])[]];
  categories: readonly [IntegrationCategory, ...IntegrationCategory[]];
  documentation: IntegrationModuleDocumentation;
  creator: IntegrationModuleCreatorEntry;
  defaultUrl?: string;
  defaultPort?: number;
  apiKeySettingsPath?: string;
  docker?: IntegrationModuleDockerMetadata;
  onboarding?: IntegrationModuleOnboardingMetadata;
}

export const defineIntegrationModule = <const TDefinition extends IntegrationModuleDefinition>(
  definition: TDefinition,
) => definition;
