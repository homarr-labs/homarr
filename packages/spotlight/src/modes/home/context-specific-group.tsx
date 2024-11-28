import { createContext, useContext } from "react";
import { Group } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";

import { createGroup } from "../../lib/group";
import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ContextSpecificResult = {
  id: string;
  name: string;
  icon: TablerIcon | string;
  useInteraction: () => inferSearchInteractionDefinition<SearchInteraction>;
};

const SpotlightContext = createContext<ContextSpecificResult[]>([]);

export const contextSpecificSearchGroups = createGroup<ContextSpecificResult>({
  title: "Context Specific",
  keyPath: "id",
  Component(option) {
    return (
      <Group>
        <option.icon size={18} />
        {option.name}
      </Group>
    );
  },
  useInteraction(option) {
    return option.useInteraction();
  },
  filter(query, option) {
    return option.name.toLowerCase().includes(query.toLowerCase());
  },
  useOptions() {
    return useContext(SpotlightContext);
  },
});
