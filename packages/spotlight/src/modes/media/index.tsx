import type { SearchMode } from "../../lib/mode";
import { mediaRequestSearchGroup } from "./media-request-search-group";

export const mediaMode = {
  mode: "media",
  character: undefined,
  label: (t) => t("search.modePicker.media.label"),
  placeholder: (t) => t("search.modePicker.media.placeholder"),
  groups: [mediaRequestSearchGroup],
} satisfies SearchMode;
