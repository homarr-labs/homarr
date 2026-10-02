import type { SearchMode } from "../../lib/mode";
import { preferencesGroup } from "./groups";

export const preferencesMode = {
  mode: "preferences",
  character: "?",
  label: (t) => t("search.modePicker.preferences.label"),
  placeholder: (t) => t("search.modePicker.preferences.placeholder"),
  groups: [preferencesGroup],
} satisfies SearchMode;
