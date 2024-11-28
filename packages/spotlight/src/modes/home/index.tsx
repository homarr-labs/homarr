import type { SearchMode } from "../../lib/mode";
import { contextSpecificSearchGroups } from "./context-specific-group";

export const pageMode = {
  character: undefined,
  modeKey: "home",
  groups: [contextSpecificSearchGroups],
} satisfies SearchMode;
