import type { stringOrTranslation } from "@homarr/translation";

import type { SearchGroup } from "./group";
import type { SpotlightMode } from "../open";

export type SearchMode = {
  mode: SpotlightMode;
  character: string | undefined;
  label: stringOrTranslation;
  placeholder: stringOrTranslation;
} & (
  | {
      groups: SearchGroup[];
    }
  | {
      useGroups: () => SearchGroup[];
    }
);
