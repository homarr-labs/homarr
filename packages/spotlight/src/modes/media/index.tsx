import type { SearchMode } from "../../lib/mode";
import { mediaRequestSearchGroup } from "./media-request-search-group";

export const mediaMode = {
  modeKey: "media",
  character: undefined,
  groups: [mediaRequestSearchGroup],
} satisfies SearchMode;
