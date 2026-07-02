import SuperJSON from "superjson";

import { eq, inArray } from "../..";
import type { Database } from "../..";
import { integrationItems, integrations, items } from "../../schema";

const removedIntegrationKinds = [
  "github",
  "dockerHub",
  "gitlab",
  "npm",
  "codeberg",
  "linuxServerIO",
  "gitHubContainerRegistry",
  "quay",
  "searchCh",
] as const;

type RemovedIntegrationKind = (typeof removedIntegrationKinds)[number];

const releaseProviderKinds = [
  "github",
  "dockerHub",
  "gitlab",
  "npm",
  "codeberg",
  "linuxServerIO",
  "gitHubContainerRegistry",
  "quay",
] as const;

const isReleaseProviderKind = (kind: RemovedIntegrationKind): kind is (typeof releaseProviderKinds)[number] =>
  releaseProviderKinds.some((provider) => provider === kind);

export async function migrateWidgetOnlyIntegrationsToOptionsAsync(db: Database) {
  const oldIntegrations = await db.query.integrations.findMany({
    columns: { id: true, kind: true, url: true },
  });
  const oldIntegrationById = new Map(
    oldIntegrations
      .filter((integration) => removedIntegrationKinds.includes(integration.kind as RemovedIntegrationKind))
      .map((integration) => [
        integration.id,
        { kind: integration.kind as RemovedIntegrationKind, url: integration.url },
      ]),
  );

  if (oldIntegrationById.size === 0) return;

  const oldIntegrationIds = Array.from(oldIntegrationById.keys());
  const oldIntegrationItems = await db.query.integrationItems.findMany();
  const oldIntegrationItemByItemId = new Map(
    oldIntegrationItems
      .filter((item) => oldIntegrationById.has(item.integrationId))
      .map((item) => [item.itemId, oldIntegrationById.get(item.integrationId)]),
  );
  const existingItems = await db.query.items.findMany({
    where: (items, { inArray }) => inArray(items.kind, ["releases", "timetable"]),
  });

  const updatedItems: { id: string; options: object }[] = [];

  for (const item of existingItems) {
    const options = SuperJSON.parse<Record<string, unknown>>(item.options);
    const linkedIntegration = oldIntegrationItemByItemId.get(item.id);

    if (item.kind === "releases" && Array.isArray(options.repositories)) {
      const repositories = options.repositories.map((repository) => {
        if (typeof repository !== "object" || repository === null) return repository;
        const { providerIntegrationId, ...rest } = repository as Record<string, unknown>;
        const provider =
          typeof providerIntegrationId === "string" ? oldIntegrationById.get(providerIntegrationId) : undefined;
        const existingProviderUrl =
          typeof rest.providerUrl === "string" && rest.providerUrl.length > 0 ? rest.providerUrl : undefined;
        return {
          ...rest,
          provider: provider && isReleaseProviderKind(provider.kind) ? provider.kind : rest.provider,
          providerUrl: provider?.url ?? existingProviderUrl,
        };
      });
      updatedItems.push({ id: item.id, options: { ...options, repositories } });
    }

    if (item.kind === "timetable" && linkedIntegration?.kind === "searchCh") {
      updatedItems.push({ id: item.id, options: { ...options, baseUrl: linkedIntegration.url } });
    }
  }

  for (const update of updatedItems) {
    await db
      .update(items)
      .set({ options: SuperJSON.stringify(update.options) })
      .where(eq(items.id, update.id));
  }

  await db.delete(integrationItems).where(inArray(integrationItems.integrationId, oldIntegrationIds));
  await db.delete(integrations).where(inArray(integrations.id, oldIntegrationIds));

  console.log(`Migrated widget-only integrations to widget options count="${updatedItems.length}"`);
}
