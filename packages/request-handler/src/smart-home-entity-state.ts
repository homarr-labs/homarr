import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { EntityState } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const safeAttributeKeys = ["friendly_name", "unit_of_measurement", "device_class", "icon"] as const;

export const toSafeEntityDetails = (entity: EntityState) => {
  const attributes: Partial<Record<(typeof safeAttributeKeys)[number], string>> = {};
  for (const key of safeAttributeKeys) {
    const value = entity.attributes[key];
    if (typeof value === "string") attributes[key] = value;
  }

  return {
    attributes,
    entity_id: entity.entity_id,
    last_changed: entity.last_changed,
    last_updated: entity.last_updated,
    state: entity.state,
  };
};

export const smartHomeEntityStateRequestHandler = createIntegrationRequestHandler<
  EntityState,
  IntegrationKindByCategory<"smartHomeServer">,
  { entityId: string }
>({
  cacheNamespace: "smart-home:entity-state",
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const result = await integrationInstance.getEntityStateAsync(input.entityId);

    if (!result.success) {
      throw new Error(`Unable to fetch data from Home Assistant error='${result.error as string}'`);
    }

    return result.data;
  },
});
