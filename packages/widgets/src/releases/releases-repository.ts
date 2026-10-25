import type { IntegrationKind, ReleaseProviderKind } from "@homarr/definitions";

export interface ReleasesVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
}

export interface ReleasesRepository {
  id: string;
  provider?: ReleaseProviderKind;
  identifier: string;
  name?: string;
  versionFilter?: ReleasesVersionFilter;
  iconUrl?: string;
  providerUrl?: string;
  integrationIds?: string[];
}

export interface ReleasesRepositoryIntegration {
  id: string;
  kind: IntegrationKind;
  name: string;
  version: string;
  /** Undefined when either version has an unsupported format. */
  isUpToDate: boolean | undefined;
}
