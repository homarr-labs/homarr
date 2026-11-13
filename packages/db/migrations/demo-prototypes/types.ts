import type { WidgetKind } from "@homarr/definitions";
import type { HeaderPreferences } from "@homarr/validation/user";

// Selected demo board data. Historical proposals are preserved at their earlier git heads.
export interface DemoPrototype {
  key: string;
  iteration?: number;
  name: string;
  question: string;
  description: string;
  headerPreferences: HeaderPreferences;
  board: {
    pageTitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    itemRadius: "xs" | "sm" | "md" | "lg" | "xl";
    backgroundImageUrl?: string;
    customCss?: string;
  };
  tabs: {
    name: string;
    explanation: string;
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
