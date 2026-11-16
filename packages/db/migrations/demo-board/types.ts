import type { WidgetKind } from "@homarr/definitions";
import type { HeaderPreferences } from "@homarr/validation/user";

export interface DemoBoardDefinition {
  headerPreferences: HeaderPreferences;
  board: {
    pageTitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    itemRadius?: "xs" | "sm" | "md" | "lg" | "xl";
    backgroundImageUrl?: string;
    customCss?: string;
  };
  tabs: {
    name: string;
    widgets: {
      kind: WidgetKind;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
      smallScreenHeight?: number;
      needsIntegration: boolean;
      integrationIds?: string[];
      options?: Record<string, unknown>;
    }[];
  }[];
}
