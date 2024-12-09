import type { SearchMode } from "../../lib/mode";
import { contextSpecificSearchGroups } from "./context-specific-group";

export const homeMode = {
  character: undefined,
  modeKey: "home",
  groups: [contextSpecificSearchGroups],
} satisfies SearchMode;
