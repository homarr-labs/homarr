import type { Modify } from "@homarr/common/types";
import type { InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db/client";
import type { integrations, integrationSecrets } from "@homarr/db/schema/sqlite";
import { getDefaultSecretKinds, getIntegrationName } from "@homarr/definitions";
import type { OldmarrConfig } from "@homarr/old-schema";

import { mapIntegrationType } from "../mappers/map-integrations";

type IntegrationWithSecrets = InferInsertModel<typeof integrations> & {
  secrets: Modify<InferInsertModel<typeof integrationSecrets>, { value: string }>[];
};

export const prepareIntegrations = (old: OldmarrConfig): IntegrationWithSecrets[] => {
  return (
    old.apps
      .filter((app) => app.integration !== undefined)
      // Fallback to externalUrl if url is not set
      .map((app) => ({ ...app.integration, url: app.url || app.behaviour.externalUrl }))
      .map((integration) => {
        if (!integration.type) return null;

        const id = createId();
        const kind = mapIntegrationType(integration.type);
        const secretKinds = getDefaultSecretKinds(kind);
        const propertyMap = new Map(integration.properties?.map((property) => [property.field, property.value]) ?? []);

        const secrets = secretKinds.map((kind) => ({
          integrationId: id,
          kind,
          value: propertyMap.get(kind) ?? null,
        }));

        // If not all default secrets for the integration are set, skip it
        if (secrets.some((secret) => secret.value === null)) {
          return null;
        }

        return {
          id,
          name: getIntegrationName(kind),
          kind,
          url: integration.url,
          secrets: secrets.map((secret) => ({
            ...secret,
            // Disabled as already return null if value is null above
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value: secret.value!,
          })),
        };
      })
      .filter((integration) => integration !== null)
  );
};
