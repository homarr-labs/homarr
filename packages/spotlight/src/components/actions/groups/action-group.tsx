import { Spotlight } from "@mantine/spotlight";

import type { SearchGroup } from "../../../lib/group";
import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import { SpotlightGroupActions } from "../group-actions";

interface SpotlightActionGroupsProps {
  groups: SearchGroup[];
  query: string;
  setMode: (mode: string) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
}

export const SpotlightActionGroups = ({ groups, query, setMode, setChildrenOptions }: SpotlightActionGroupsProps) => {
  return groups.map((group) => (
    <Spotlight.ActionsGroup key={group.title} label={group.title}>
      {/*eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SpotlightGroupActions<any>
        group={group}
        query={query}
        setMode={setMode}
        setChildrenOptions={setChildrenOptions}
      />
    </Spotlight.ActionsGroup>
  ));
};
