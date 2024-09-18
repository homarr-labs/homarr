import type { SearchMode } from "../../lib/mode";
import { appsSearchGroup } from "./apps-search-group";
import { boardsSearchGroup } from "./boards-search-group";
import { integrationsSearchGroup } from "./integrations-search-group";

export const appIntegrationBoardMode = {
  modeKey: "appIntegrationBoard",
  character: "#",
  groups: [appsSearchGroup, integrationsSearchGroup, boardsSearchGroup],
} satisfies SearchMode;
