import { useSession } from "@homarr/auth/client";

import type { SearchMode } from "../../lib/mode";
import { groupsSearchGroup } from "./groups-search-group";
import { usersSearchGroup } from "./users-search-group";

export const userGroupMode = {
  mode: "userGroup",
  character: "@",
  label: (t) => t("search.modePicker.userGroup.label"),
  placeholder: (t) => t("search.modePicker.userGroup.placeholder"),
  useGroups() {
    const { data: session } = useSession();
    if (!session?.user.permissions.includes("admin")) return [];
    return [usersSearchGroup, groupsSearchGroup];
  },
} satisfies SearchMode;
