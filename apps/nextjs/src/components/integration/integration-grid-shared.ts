import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import {
  featuredIntegrations,
  getIntegrationName,
  hiddenFromOnboarding,
  integrationDefs,
  integrationKinds,
  getWidgetKindsForIntegration,
} from "@homarr/definitions";

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
  beszel: "integration.category.beszel",
  search: "integration.category.search",
  mediaTranscoding: "integration.category.mediaTranscoding",
  networkController: "integration.category.networkController",
  notifications: "integration.category.notifications",
  firewall: "integration.category.firewall",
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
): IntegrationGridItem[] => {
  return integrationKinds
    .filter((kind) => {
      if (options.onboarding && hiddenFromOnboarding.has(kind)) return false;
      if (options.onboarding && getWidgetKindsForIntegration(kind).length === 0) return false;
      if (!options.enableMockIntegration && kind === "mock") return false;
      return true;
    })
    .map((kind) => ({
      kind,
      name: getIntegrationName(kind),
      categories: [...new Set(integrationDefs[kind].category.flat())] as string[],
      widgets: getWidgetKindsForIntegration(kind),
    }))
    .toSorted((left, right) => {
      const leftIdx = featuredIntegrations.indexOf(left.kind);
      const rightIdx = featuredIntegrations.indexOf(right.kind);
      if (leftIdx !== -1 && rightIdx !== -1) return leftIdx - rightIdx;
      if (leftIdx !== -1) return -1;
      if (rightIdx !== -1) return 1;
      return right.widgets.length - left.widgets.length || left.name.localeCompare(right.name);
    });
};

export const filterIntegrations = (items: IntegrationGridItem[], search: string) =>
  items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase().trim()));
