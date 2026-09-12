import { useMemo } from "react";

import { useWidgetNow } from "@homarr/widget-sdk";

export const useCurrentTime = ({ showSeconds }: { showSeconds: boolean }) => {
  let interval = 60_000;
  if (showSeconds) interval = 1000;
  const timestamp = useWidgetNow(interval);
  return useMemo(() => {
    if (timestamp === null) return null;
    return new Date(timestamp);
  }, [timestamp]);
};
