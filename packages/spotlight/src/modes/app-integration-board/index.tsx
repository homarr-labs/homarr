import { useSession } from "@homarr/auth/client";

import type { SearchGroup } from "../../lib/group";
import type { SearchMode } from "../../lib/mode";
import { appsSearchGroup } from "./apps-search-group";
import { boardsSearchGroup } from "./boards-search-group";
import { integrationsSearchGroup } from "./integrations-search-group";

export const appIntegrationBoardMode = {
  modeKey: "appIntegrationBoard",
  character: "#",
  useGroups() {
    const { data: session } = useSession();
    const groups: SearchGroup[] = [boardsSearchGroup];

    if (!session?.user) {
      return groups;
    }

    // Mirrors the gate on app.search: either permission may browse the app catalogue, so an app
    // administrator without board access still gets the group instead of a FORBIDDEN response.
    const canSearchApps =
      session.user.permissions.includes("board-modify-all") || session.user.permissions.includes("app-modify-all");

    return groups.concat(canSearchApps ? [appsSearchGroup, integrationsSearchGroup] : [integrationsSearchGroup]);
  },
} satisfies SearchMode;
