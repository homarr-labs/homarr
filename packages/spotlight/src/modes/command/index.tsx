import type { SearchMode } from "../../lib/mode";
import { contextSpecificActionsSearchGroups } from "./context-specific-group";
import { globalCommandGroup } from "./global-group";
import { preferencesGroup } from "../preferences/groups";

export const commandMode = {
  mode: "command",
  character: ">",
  label: (t) => t("search.modePicker.command.label"),
  placeholder: (t) => t("search.modePicker.command.placeholder"),
  groups: [contextSpecificActionsSearchGroups, globalCommandGroup, preferencesGroup],
} satisfies SearchMode;
