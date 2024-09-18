import type { inferSearchInteractionOptions } from "../../lib/interaction";
import { ChildrenActionItem } from "./items/children-action-item";

interface SpotlightChildrenActionsProps {
  childrenOptions: inferSearchInteractionOptions<"children">;
  query: string;
}

export const SpotlightChildrenActions = ({ childrenOptions, query }: SpotlightChildrenActionsProps) => {
  const actions = childrenOptions.useActions(childrenOptions.option);

  return actions
    .filter((action) => (typeof action.hide === "function" ? !action.hide(childrenOptions.option) : !action.hide))
    .map((action) => (
      <ChildrenActionItem key={action.key} childrenOptions={childrenOptions} query={query} action={action} />
    ));
};
