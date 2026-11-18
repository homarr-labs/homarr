import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetClockPrecision } from "../common/use-widget-now";

export const useCurrentTime = ({ showSeconds }: { showSeconds: boolean }) => {
  let precision: WidgetClockPrecision = "minute";
  if (showSeconds) precision = "second";
  return useWidgetNow(precision);
};
