import { createWidgetDefinition } from "../definition";
import { definition as rawDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "archiveTeamWarrior",
  rawDefinition,
).withDynamicImport(() => import("./component"));
