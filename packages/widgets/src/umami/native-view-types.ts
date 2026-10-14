import type { ReactNode } from "react";
import type { RouterOutputs } from "@homarr/api";
import type { formatTimeFrameLabel, formatXLabel, TimeFrame } from "./umami-utils";

export interface UmamiContentProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: TimeFrame;
  eventName?: string;
  eventNames: string[];
  chartStyle: string;
  chartType: string;
  viewMode: string;
  topCount: number;
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

export interface NativeUmamiViewProps extends Omit<UmamiContentProps, "integrationIds" | "websiteId" | "topCount"> {
  results: RouterOutputs["widget"]["umami"]["getVisitorStats"] | undefined;
  activeVisitors: RouterOutputs["widget"]["umami"]["getActiveVisitors"] | undefined;
  multiEventSeries: RouterOutputs["widget"]["umami"]["getMultiEventTimeSeries"] | undefined;
  isPending: boolean;
  formatXLabel: typeof formatXLabel;
  formatTimeFrameLabel: typeof formatTimeFrameLabel;
  eventColors: readonly string[];
  renderTopPages: () => ReactNode;
  renderTopReferrers: () => ReactNode;
}
