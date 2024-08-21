import { MantineTheme } from "@mantine/core";
import { Property } from "csstype";

import { OldmarrWidgetKinds as OldmarrWidgetKind } from "./widgets/definitions/common";

export type OldmarrConfig = {
  schemaVersion: number;
  configProperties: {
    name: string;
  };
  categories: CategoryType[];
  wrappers: WrapperType[];
  apps: OldmarrApp[];
  widgets: OldmarrWidget[];
  settings: SettingsType;
};

interface CategoryType {
  id: string;
  position: number;
  name: string;
}

interface WrapperType {
  id: string;
  position: number;
}

export interface OldmarrApp extends TileBaseType {
  id: string;
  name: string;
  url: string;
  behaviour: AppBehaviourType;
  network: AppNetworkType;
  appearance: AppAppearanceType;
  integration: AppIntegrationType;
}

interface AppBehaviourType {
  externalUrl: string;
  isOpeningNewTab: boolean;
  tooltipDescription?: string;
}

interface AppNetworkType {
  enabledStatusChecker: boolean;
  /**
   * @deprecated replaced by statusCodes
   */
  okStatus?: number[];
  statusCodes: string[];
}

interface AppAppearanceType {
  iconUrl: string;
  appNameStatus: "normal" | "hover" | "hidden";
  positionAppName: Property.FlexDirection;
  appNameFontSize: number;
  lineClampAppName: number;
}

type IntegrationType =
  | "readarr"
  | "radarr"
  | "sonarr"
  | "lidarr"
  | "prowlarr"
  | "sabnzbd"
  | "jellyseerr"
  | "overseerr"
  | "deluge"
  | "qBittorrent"
  | "transmission"
  | "plex"
  | "jellyfin"
  | "nzbGet"
  | "pihole"
  | "adGuardHome"
  | "homeAssistant"
  | "openmediavault"
  | "proxmox"
  | "tdarr";

type AppIntegrationType = {
  type: IntegrationType | null;
  properties: AppIntegrationPropertyType[];
};

type AppIntegrationPropertyType = {
  type: AppIntegrationPropertyAccessabilityType;
  field: IntegrationField;
  value?: string | null;
  isDefined: boolean;
};

type AppIntegrationPropertyAccessabilityType = "private" | "public";

type IntegrationField = "apiKey" | "password" | "username";

interface TileBaseType {
  area: AreaType;
  shape: ShapeType;
}

type AreaType = WrapperAreaType | CategoryAreaType | SidebarAreaType;

interface WrapperAreaType {
  type: "wrapper";
  properties: {
    id: string;
  };
}

interface CategoryAreaType {
  type: "category";
  properties: {
    id: string;
  };
}

interface SidebarAreaType {
  type: "sidebar";
  properties: {
    location: "right" | "left";
  };
}

interface ShapeType {
  lg?: SizedShapeType;
  md?: SizedShapeType;
  sm?: SizedShapeType;
}

interface SizedShapeType {
  location: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export type OldmarrWidget = {
  id: string;
  type: OldmarrWidgetKind;
  properties: Record<string, unknown>;
  area: AreaType;
  shape: ShapeType;
};

interface SettingsType {
  common: CommonSettingsType;
  customization: CustomizationSettingsType;
  access: BoardAccessSettingsType;
}

interface BoardAccessSettingsType {
  allowGuests: boolean;
}

interface CommonSettingsType {
  searchEngine: SearchEngineCommonSettingsType;
}

type SearchEngineCommonSettingsType = CommonSearchEngineCommonSettingsType | CustomSearchEngineCommonSettingsType;

interface CommonSearchEngineCommonSettingsType extends BaseSearchEngineType {
  type: "google" | "duckDuckGo" | "bing";
}

interface CustomSearchEngineCommonSettingsType extends BaseSearchEngineType {
  type: "custom";
  properties: {
    template: string;
    openInNewTab: boolean;
    enabled: boolean;
  };
}

interface BaseSearchEngineType {
  properties: {
    openInNewTab: boolean;
    enabled: boolean;
  };
}

interface CustomizationSettingsType {
  layout: LayoutCustomizationSettingsType;
  pageTitle?: string;
  metaTitle?: string;
  logoImageUrl?: string;
  faviconUrl?: string;
  backgroundImageUrl?: string;
  backgroundImageAttachment?: (typeof BackgroundImageAttachment)[number];
  backgroundImageSize?: (typeof BackgroundImageSize)[number];
  backgroundImageRepeat?: (typeof BackgroundImageRepeat)[number];
  customCss?: string;
  colors: ColorsCustomizationSettingsType;
  appOpacity?: number;
  gridstack?: GridstackSettingsType;
  accessibility: AccessibilitySettings;
}

const BackgroundImageAttachment = ["fixed", "scroll"] as const;

const BackgroundImageSize = ["cover", "contain"] as const;

const BackgroundImageRepeat = ["no-repeat", "repeat", "repeat-x", "repeat-y"] as const;

interface AccessibilitySettings {
  disablePingPulse: boolean;
  replacePingDotsWithIcons: boolean;
}

interface GridstackSettingsType {
  columnCountSmall: number; // default: 3
  columnCountMedium: number; // default: 6
  columnCountLarge: number; // default: 12
}

interface LayoutCustomizationSettingsType {
  enabledLeftSidebar: boolean;
  enabledRightSidebar: boolean;
  enabledDocker: boolean;
  enabledPing: boolean;
  enabledSearchbar: boolean;
}

interface ColorsCustomizationSettingsType {
  primary?: MantineTheme["primaryColor"];
  secondary?: MantineTheme["primaryColor"];
  shade?: MantineTheme["primaryShade"];
}
