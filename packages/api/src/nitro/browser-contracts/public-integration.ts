import type { ExpansionApiAssemblyClient } from "../assembly/client";

export type PublicIntegrationCatalogClient = {
  integration: {
    getKinds: ExpansionApiAssemblyClient["integration"]["getKinds"];
  };
};
