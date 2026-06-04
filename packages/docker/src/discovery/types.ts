import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

export interface DiscoveredService {
  containerId: string;
  host: string;
  group: string;
  name: string;
  href: string;
  icon?: string;
  description?: string;
  pingUrl?: string;
  externalId: string;
  boardName?: string;
  integrationKind?: IntegrationKind;
  widgetKind?: WidgetKind;
}
