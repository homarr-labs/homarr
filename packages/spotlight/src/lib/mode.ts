import type { TranslationObject } from "@homarr/translation";

import type { SearchGroup } from "./group";

export type SearchMode = {
  modeKey: keyof TranslationObject["search"]["mode"];
  character: string;
} & (
  | {
      groups: SearchGroup[];
    }
  | {
      useGroups: () => SearchGroup[];
    }
);
