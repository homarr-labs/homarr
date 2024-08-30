import type { ReactNode } from "react";

import type { SearchGroup } from "./group";

export interface SearchMode {
  name: string;
  character: string;
  help: string | undefined;
  tip: ReactNode;
  groups: SearchGroup[];
}
