import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrationIds: string[];
  advancedOptions: BoardItemAdvancedOptions;
}
