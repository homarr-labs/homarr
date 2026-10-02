import { Spotlight } from "@mantine/spotlight";

import { getSafeAppHref, SAFE_NEW_TAB_REL } from "@homarr/common";
import { Link } from "@homarr/ui";

import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import classes from "./action-item.module.css";

interface ChildrenActionItemProps {
  childrenOptions: inferSearchInteractionOptions<"children">;
  query: string;
  action: ReturnType<inferSearchInteractionOptions<"children">["useActions"]>[number];
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
}

export const ChildrenActionItem = ({ childrenOptions, action, query, setChildrenOptions }: ChildrenActionItemProps) => {
  const interaction = action.useInteraction(childrenOptions.option, query);

  const safeHref = interaction.type === "link" ? getSafeAppHref(interaction.href) : undefined;
  const renderRoot =
    interaction.type === "link" && safeHref
      ? (props: Record<string, unknown>) => {
          return (
            <Link
              href={safeHref}
              target={interaction.newTab ? "_blank" : undefined}
              rel={interaction.newTab ? SAFE_NEW_TAB_REL : undefined}
              {...props}
            />
          );
        }
      : undefined;

  const onClick =
    interaction.type === "javaScript"
      ? interaction.onSelect
      : interaction.type === "children"
        ? () => setChildrenOptions(interaction)
        : undefined;

  return (
    <Spotlight.Action
      renderRoot={renderRoot}
      onClick={onClick}
      closeSpotlightOnTrigger={
        interaction.type !== "children" &&
        (interaction.type !== "javaScript" || interaction.closeSpotlightOnTrigger !== false)
      }
      className={classes.spotlightAction}
    >
      <action.Component {...childrenOptions.option} />
    </Spotlight.Action>
  );
};
