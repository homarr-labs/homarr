import Link from "next/link";
import { Spotlight } from "@mantine/spotlight";

import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import classes from "./action-item.module.css";

interface ChildrenActionItemProps {
  childrenOptions: inferSearchInteractionOptions<"children">;
  query: string;
  action: ReturnType<inferSearchInteractionOptions<"children">["useActions"]>[number];
}

export const ChildrenActionItem = ({ childrenOptions, action, query }: ChildrenActionItemProps) => {
  const interaction = action.useInteraction(childrenOptions.option, query);

  const renderRoot =
    interaction.type === "link"
      ? (props: Record<string, unknown>) => {
          return <Link href={interaction.href} {...props} />;
        }
      : undefined;

  const onClick = interaction.type === "javaScript" ? interaction.onSelect : undefined;

  return (
    <Spotlight.Action renderRoot={renderRoot} onClick={onClick} className={classes.spotlightAction}>
      <action.component {...childrenOptions.option} />
    </Spotlight.Action>
  );
};
