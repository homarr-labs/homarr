import type { SearchMode } from "../../lib/mode";
import { preferencesGroup } from "../preferences/groups";
import { contextSpecificSearchGroups } from "./context-specific-group";
import { homeSearchEngineGroup } from "./home-search-engine-group";

export const homeMode = {
  character: undefined,
  modeKey: "home",
  groups: [preferencesGroup, homeSearchEngineGroup, contextSpecificSearchGroups],
} satisfies SearchMode;
