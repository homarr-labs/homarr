import { Group, Text } from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { IntegrationAvatar } from "@homarr/ui";

import { filterCatalog, useIntegrationsCatalogQuery } from "../../lib/catalog";
import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";

export const integrationsSearchGroup = createGroup<{ id: string; kind: IntegrationKind; name: string }>({
  keyPath: "id",
  title: (t) => t("common.entity.integrations"),
  source: { kind: "remote", source: "integrations" },
  Component: (integration) => (
    <Group px="md" py="sm">
      <IntegrationAvatar size="sm" kind={integration.kind} />

      <Text>{integration.name}</Text>
    </Group>
  ),
  useInteraction: interaction.link(({ id }) => ({ href: `/manage/integrations/edit/${id}` })),
  useQueryOptions(query) {
    const catalogQuery = useIntegrationsCatalogQuery();
    return {
      data: filterCatalog(catalogQuery.data ?? [], query, (integration) => [integration.name, integration.kind]),
      isLoading: catalogQuery.isLoading,
      isError: catalogQuery.isError,
    };
  },
});
