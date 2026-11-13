import type { WidgetKind } from "@homarr/definitions";
import type { HeaderPreferences } from "@homarr/validation/user";

// Throwaway native-board proposals. Human selection is required before promotion.
export interface DemoPrototype {
  key: string;
  name: string;
  question: string;
  description: string;
  headerPreferences: HeaderPreferences;
  board: {
    pageTitle: string;
    primaryColor: string;
    secondaryColor: string;
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
      needsIntegration: boolean;
      options?: Record<string, unknown>;
    }[];
  }[];
}
