import { useWidgetNow } from "../common/use-widget-now";

export const useCurrentTime = ({ showSeconds }: { showSeconds: boolean }) =>
  useWidgetNow(showSeconds ? "second" : "minute");
