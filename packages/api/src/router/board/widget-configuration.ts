import { TRPCError } from "@trpc/server";

import { inArray } from "@homarr/db";
import { integrations } from "@homarr/db/schema";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { getWidgetIntegrationIssue, getWidgetIntegrationIssueMessage } from "@homarr/definitions";

import { throwIfIntegrationActionsForbiddenAsync } from "../integration/integration-access";

interface WidgetConfiguration {
  id: string;
  kind: WidgetKind;
  integrationIds: readonly string[];
}

const haveSameIntegrationIds = (left: readonly string[], right: readonly string[]) => {
  if (left.length !== right.length) return false;
  const sortedRight = right.toSorted();
  return left.toSorted().every((integrationId, index) => integrationId === sortedRight[index]);
};

export const validateWidgetConfigurationsAsync = async (
  ctx: Parameters<typeof throwIfIntegrationActionsForbiddenAsync>[0],
  submittedItems: readonly WidgetConfiguration[],
  storedItems: readonly WidgetConfiguration[] = [],
) => {
  const storedItemsById = new Map(storedItems.map((item) => [item.id, item]));
  const changedItems = submittedItems.filter((item) => {
    const storedItem = storedItemsById.get(item.id);
    if (!storedItem || storedItem.kind !== item.kind) return true;
    return !haveSameIntegrationIds(item.integrationIds, storedItem.integrationIds);
  });
  if (changedItems.length === 0) return;

  const selectedIntegrationIds = [...new Set(changedItems.flatMap(({ integrationIds }) => integrationIds))];
  let integrationRecords: { id: string; kind: IntegrationKind }[] = [];
  if (selectedIntegrationIds.length > 0) {
    integrationRecords = await ctx.db.query.integrations.findMany({
      columns: { id: true, kind: true },
      where: inArray(integrations.id, selectedIntegrationIds),
    });
  }
  const integrationRecordsById = new Map(integrationRecords.map((integration) => [integration.id, integration]));
  const invalidIntegrationIds = selectedIntegrationIds.filter(
    (integrationId) => !integrationRecordsById.has(integrationId),
  );
  if (invalidIntegrationIds.length > 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Integration not found",
    });
  }

  const addedOrReconfiguredIntegrationIds = [
    ...new Set(
      changedItems.flatMap((item) => {
        const storedItem = storedItemsById.get(item.id);
        if (!storedItem || storedItem.kind !== item.kind) return item.integrationIds;
        return item.integrationIds.filter((integrationId) => !storedItem.integrationIds.includes(integrationId));
      }),
    ),
  ];
  await throwIfIntegrationActionsForbiddenAsync(ctx, addedOrReconfiguredIntegrationIds, "use");

  for (const item of changedItems) {
    const selectedIntegrationKinds = item.integrationIds.flatMap(
      (integrationId) => integrationRecordsById.get(integrationId)?.kind ?? [],
    );
    const integrationIssue = getWidgetIntegrationIssue(item.kind, selectedIntegrationKinds);
    if (!integrationIssue) continue;

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: getWidgetIntegrationIssueMessage(item.kind, integrationIssue),
    });
  }
};
