import type { CustomWidgetDisplayAdapters, CustomWidgetDisplayComponent } from "./display-types";
import { createRawDisplay, KeyValueDisplay, StatusIndicatorDisplay, TableDisplay } from "./collection-displays";
import { CountGridDisplay, ProgressBarsDisplay, SingleValueDisplay, StatGridDisplay } from "./metric-displays";

export function createCustomWidgetDisplayComponents(
  adapters: CustomWidgetDisplayAdapters,
): Record<string, CustomWidgetDisplayComponent> {
  return {
    singleValue: SingleValueDisplay,
    keyValue: KeyValueDisplay,
    table: TableDisplay,
    statGrid: StatGridDisplay,
    progressBars: ProgressBarsDisplay,
    statusIndicator: StatusIndicatorDisplay,
    countGrid: CountGridDisplay,
    raw: createRawDisplay(adapters.openJsonLabel),
    actionButton: adapters.actionButton,
    customJsx: adapters.customJsx,
  } satisfies Record<string, CustomWidgetDisplayComponent>;
}
