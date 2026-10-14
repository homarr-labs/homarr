import { createWidgetDefinition } from "../../definition";
import { definition as dnsHoleSummaryDefinition } from "./definition";

export const widgetKind = "dnsHoleSummary";

export const { definition, componentLoader } = createWidgetDefinition(
  widgetKind,
  dnsHoleSummaryDefinition,
).withDynamicImport(() => import("./component"));
