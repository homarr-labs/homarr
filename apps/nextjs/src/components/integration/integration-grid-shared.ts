import { objectEntries } from "@homarr/common";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import {
  featuredIntegrations,
  getIntegrationName,
  hiddenFromOnboarding,
  integrationDefs,
  integrationKinds,
} from "@homarr/definitions";
import { widgetImports } from "@homarr/widgets";

const buildWidgetsByIntegration = () => {
  const map = Object.fromEntries(integrationKinds.map((kind) => [kind, [] as WidgetKind[]])) as Record<
    IntegrationKind,
    WidgetKind[]
  >;

  for (const [widgetKind, widget] of objectEntries(widgetImports)) {
    const supported =
      "supportedIntegrations" in widget.definition
        ? (widget.definition.supportedIntegrations as IntegrationKind[])
        : [];
    for (const kind of supported) {
      if (kind in map) {
        map[kind].push(widgetKind);
      }
    }
  }
  return map;
};

export const widgetsByIntegration = buildWidgetsByIntegration();

export const categoryTranslationKeys: Record<string, string> = {
  dnsHole: "integration.category.dnsHole",
  mediaService: "integration.category.mediaService",
  calendar: "integration.category.calendar",
  mediaSearch: "integration.category.mediaSearch",
  mediaRelease: "integration.category.mediaRelease",
  mediaRequest: "integration.category.mediaRequest",
  downloadClient: "integration.category.downloadClient",
  usenet: "integration.category.usenet",
  torrent: "integration.category.torrent",
  miscellaneous: "integration.category.miscellaneous",
  smartHomeServer: "integration.category.smartHomeServer",
  indexerManager: "integration.category.indexerManager",
  healthMonitoring: "integration.category.healthMonitoring",
  search: "integration.category.search",
  mediaTranscoding: "integration.category.mediaTranscoding",
  networkController: "integration.category.networkController",
  releasesProvider: "integration.category.releasesProvider",
  notifications: "integration.category.notifications",
  firewall: "integration.category.firewall",
  timetable: "integration.category.timetable",
  photoService: "integration.category.photoService",
  notes: "integration.category.notes",
  mediaMonitoring: "integration.category.mediaMonitoring",
  speedtest: "integration.category.speedtest",
  analytics: "integration.category.analytics",
  vpn: "integration.category.vpn",
  documents: "integration.category.documents",
  mediaLibrary: "integration.category.mediaLibrary",
  uptimeMonitoring: "integration.category.uptimeMonitoring",
};

export interface IntegrationGridItem {
  kind: IntegrationKind;
  name: string;
  categories: string[];
  widgets: WidgetKind[];
}

export const buildSortedIntegrations = (
  options: { enableMockIntegration?: boolean; onboarding?: boolean } = {},
): IntegrationGridItem[] =>
  integrationKinds
    .filter((kind) => {
      if (options.onboarding && hiddenFromOnboarding.has(kind)) return false;
      if (options.onboarding && widgetsByIntegration[kind].length === 0) return false;
      if (!options.enableMockIntegration && kind === "mock") return false;
      return true;
    })
    .map((kind) => ({
      kind,
      name: getIntegrationName(kind),
      categories: [...new Set(integrationDefs[kind].category.flat())] as string[],
      widgets: widgetsByIntegration[kind],
    }))
    .sort((left, right) => {
      const leftIdx = featuredIntegrations.indexOf(left.kind);
      const rightIdx = featuredIntegrations.indexOf(right.kind);
      if (leftIdx !== -1 && rightIdx !== -1) return leftIdx - rightIdx;
      if (leftIdx !== -1) return -1;
      if (rightIdx !== -1) return 1;
      return right.widgets.length - left.widgets.length || left.name.localeCompare(right.name);
    });

export const filterIntegrations = (items: IntegrationGridItem[], search: string) =>
  items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase().trim()));
