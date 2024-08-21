import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrDnsHoleSummaryDefinition
  extends CommonOldmarrWidgetDefinition<
    "dns-hole-summary",
    { usePiHoleColors: boolean; layout: "column" | "row" | "grid" }
  > {}
