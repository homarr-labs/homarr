import { createWidgetDefinition } from "../definition";
import { definition as calendarDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("calendar", calendarDefinition).withDynamicImport(
  () => import("./component"),
);
