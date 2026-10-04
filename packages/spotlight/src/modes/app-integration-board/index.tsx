import { useSession } from "@homarr/auth/client";

import type { SearchGroup } from "../../lib/group";
import type { SearchMode } from "../../lib/mode";
import { contextSpecificAppsSearchGroup } from "../home/context-specific-group";
import { appsSearchGroup } from "./apps-search-group";
import { boardsSearchGroup } from "./boards-search-group";
import { integrationsSearchGroup } from "./integrations-search-group";

export const appIntegrationBoardMode = {
  mode: "apps",
  character: "#",
  label: (t) => t("search.modePicker.apps.label"),
  placeholder: (t) => t("search.modePicker.apps.placeholder"),
  useGroups() {
    const { data: session } = useSession();
    const groups: SearchGroup[] = [contextSpecificAppsSearchGroup];

    if (!session?.user) {
      return groups.concat(boardsSearchGroup);
    }

    // Mirrors the gate on app.search: either permission may browse the app catalogue, so an app
    // administrator without board access still gets the group instead of a FORBIDDEN response.
    const canSearchApps =
      session.user.permissions.includes("board-modify-all") || session.user.permissions.includes("app-modify-all");

    if (canSearchApps) {
      return groups.concat(appsSearchGroup, boardsSearchGroup, integrationsSearchGroup);
    }

    return groups.concat(boardsSearchGroup, integrationsSearchGroup);
  },
} satisfies SearchMode;
