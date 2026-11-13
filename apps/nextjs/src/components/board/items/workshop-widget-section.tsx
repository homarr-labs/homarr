import { useMemo } from "react";
import { Anchor, Center, Divider, Group, Loader, Text, ThemeIcon } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { isHttpIntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { SelectableCard } from "@homarr/ui";
import { useWorkshopWidgetCatalogQuery } from "@homarr/workshop/backend";

import { createWorkshopClient } from "~/components/workshop/workshop-client";
import { matchesIntegrationSearch } from "./item-select-data";
import { ConnectionStatusBadge, SupportedIntegrations } from "./widget-card-connection";

interface WorkshopCatalogFilter {
  enabled: boolean;
  searchQuery: string;
  integrationFilter: IntegrationKind | null;
  availableKinds: ReadonlySet<IntegrationKind> | undefined;
}

export function useFilteredWorkshopCatalog({
  enabled,
  searchQuery,
  integrationFilter,
  availableKinds,
}: WorkshopCatalogFilter) {
  const { data, isPending, isError } = useWorkshopWidgetCatalogQuery(createWorkshopClient(), enabled);
  const items = useMemo(() => {
    return (data ?? [])
      .flatMap((item) => {
        const supportedIntegrations = item.integrationKinds.filter(isHttpIntegrationKind);
        // An older Homarr version cannot bind a source type it does not know.
        if (supportedIntegrations.length !== item.integrationKinds.length) return [];
        if (integrationFilter && !supportedIntegrations.some((kind) => kind === integrationFilter)) return [];
        if (
          searchQuery &&
          !`${item.title}\n${item.description}`.toLowerCase().includes(searchQuery) &&
          !supportedIntegrations.some((kind) => matchesIntegrationSearch(kind, searchQuery))
        )
          return [];
        const isCompatible =
          supportedIntegrations.length === 0 ||
          Boolean(availableKinds && supportedIntegrations.every((kind) => availableKinds.has(kind)));
        if (!searchQuery && !integrationFilter && !isCompatible) return [];
        return [{ ...item, supportedIntegrations, isCompatible }];
      })
      .toSorted((left, right) => Number(right.isCompatible) - Number(left.isCompatible));
  }, [data, searchQuery, integrationFilter, availableKinds]);
  return { items, isPending, isError };
}

interface WorkshopWidgetSectionProps {
  catalog: ReturnType<typeof useFilteredWorkshopCatalog>;
  availableKinds: ReadonlySet<IntegrationKind> | undefined;
  integrationError: boolean;
  search: string;
  integrationFilter: IntegrationKind | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}

export function WorkshopWidgetSection({
  catalog,
  availableKinds,
  integrationError,
  search,
  integrationFilter,
  disabled,
  onSelect,
}: WorkshopWidgetSectionProps) {
  const t = useI18n();
  const { items, isPending, isError } = catalog;
  const fullWidth = { gridColumn: "1 / -1" };
  const hasSearch = Boolean(search || integrationFilter);
  let emptyMessage = t("item.create.workshop.empty");
  if (hasSearch) emptyMessage = t("item.create.workshop.noMatches");
  if (isError) emptyMessage = t("workshop.unavailableTitle");
  const waitingForIntegrations = !hasSearch && availableKinds === undefined && !integrationError && !isError;
  const loading = isPending || waitingForIntegrations;
  const showEmpty = items.length === 0 && !loading && (hasSearch || isError || !integrationError);

  return (
    <>
      <Divider
        label={
          <Group gap="xs">
            <IconBuildingStore size={14} />
            <Text size="xs" fw={600}>
              {t("item.create.workshop.title")}
            </Text>
          </Group>
        }
        labelPosition="center"
        my="sm"
        style={fullWidth}
      />
      {integrationError && (
        <Text size="sm" c="dimmed" style={fullWidth}>
          {t("item.create.workshop.integrationError")}
        </Text>
      )}
      {loading && (
        <Center component="output" py="sm" style={fullWidth} aria-label={t("item.create.workshop.loading")}>
          <Loader size="sm" />
        </Center>
      )}
      {showEmpty && (
        <Text size="sm" c="dimmed" style={fullWidth}>
          {emptyMessage}
        </Text>
      )}
      {items.map((item) => (
        <SelectableCard
          key={item.id}
          onClick={() => onSelect(item.id)}
          disabled={disabled}
          aria-label={item.title}
          icon={
            <ThemeIcon size={34} radius="md" variant="light">
              <IconBuildingStore size={20} />
            </ThemeIcon>
          }
          title={item.title}
          description={item.description}
          topRight={
            availableKinds &&
            item.supportedIntegrations.length > 0 && (
              <ConnectionStatusBadge status={item.isCompatible ? "ready" : "needsSetup"} />
            )
          }
          footerLeft={
            <SupportedIntegrations integrations={item.supportedIntegrations} availableKinds={availableKinds} />
          }
        />
      ))}
      <Anchor
        href="/manage/custom-widgets/workshop"
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
        ta="right"
        style={fullWidth}
      >
        {t("workshop.browseWorkshop")}
      </Anchor>
    </>
  );
}
