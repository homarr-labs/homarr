import type { SearchMode } from "../../lib/mode";
import { searchEnginesSearchGroups } from "./search-engines-search-group";

export const externalMode = {
  mode: "external",
  character: "!",
  label: (t) => t("search.modePicker.external.label"),
  placeholder: (t) => t("search.modePicker.external.placeholder"),
  groups: [searchEnginesSearchGroups],
} satisfies SearchMode;
