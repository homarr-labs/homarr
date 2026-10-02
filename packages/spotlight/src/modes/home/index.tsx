import type { SearchMode } from "../../lib/mode";
import { appIntegrationBoardMode } from "../app-integration-board";
import { contextSpecificActionsSearchGroups } from "../command/context-specific-group";
import { globalCommandGroup } from "../command/global-group";
import { homeSearchEngineGroup } from "./home-search-engine-group";
import {
  contextSpecificAppsSearchGroup,
  contextSpecificFallbackSearchGroup,
  contextSpecificSearchGroups,
} from "./context-specific-group";
import { mediaFallbackGroup } from "../media/media-fallback-group";
import { pagesSearchGroup } from "../page/pages-search-group";
import { preferencesGroup } from "../preferences/groups";
import { userGroupMode } from "../user-group";

export const homeMode = {
  mode: "search",
  character: "/",
  label: (t) => t("search.modePicker.search.label"),
  placeholder: (t) => t("search.modePicker.search.placeholder"),
  useGroups() {
    const appGroups = appIntegrationBoardMode.useGroups().filter((group) => group !== contextSpecificAppsSearchGroup);
    const directoryGroups = userGroupMode.useGroups();

    return [
      contextSpecificSearchGroups,
      pagesSearchGroup,
      contextSpecificActionsSearchGroups,
      globalCommandGroup,
      preferencesGroup,
      ...appGroups,
      ...directoryGroups,
      homeSearchEngineGroup,
      contextSpecificFallbackSearchGroup,
      mediaFallbackGroup,
    ];
  },
} satisfies SearchMode;
