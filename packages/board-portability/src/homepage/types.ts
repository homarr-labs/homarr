export interface HomepageService {
  group: string;
  name: string;
  icon?: string;
  href?: string;
  description?: string;
  ping?: string;
  siteMonitor?: string;
  widgets: HomepageWidget[];
}

export interface HomepageWidget {
  type: string;
  url?: string;
  key?: string;
  [key: string]: unknown;
}

export type ParseServicesYamlResult =
  | { success: true; services: HomepageService[] }
  | { success: false; error: string };
