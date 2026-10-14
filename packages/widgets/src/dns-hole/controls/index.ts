import { createWidgetDefinition } from "../../definition";
import { definition as dnsHoleControlsDefinition } from "./definition";

export const widgetKind = "dnsHoleControls";

export const { definition, componentLoader } = createWidgetDefinition(
  widgetKind,
  dnsHoleControlsDefinition,
).withDynamicImport(() => import("./component"));
