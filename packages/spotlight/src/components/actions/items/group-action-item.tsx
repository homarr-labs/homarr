import Link from "next/link";
import { Spotlight } from "@mantine/spotlight";

import type { SearchGroup } from "../../../lib/group";
import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import classes from "./action-item.module.css";

interface SpotlightGroupActionItemProps<TOption extends Record<string, unknown>> {
  option: TOption;
  query: string;
  setMode: (mode: string) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
  group: SearchGroup<TOption>;
}

export const SpotlightGroupActionItem = <TOption extends Record<string, unknown>>({
  group,
  query,
  setMode,
  setChildrenOptions,
  option,
}: SpotlightGroupActionItemProps<TOption>) => {
  const interaction = group.useInteraction(option, query);

  if (interaction.type === "disabled") {
    return <></>;
  }

  const renderRoot =
    interaction.type === "link"
      ? (props: Record<string, unknown>) => {
          return <Link href={interaction.href} {...props} />;
        }
      : undefined;

  const onClick =
    interaction.type === "javaScript"
      ? interaction.onSelect
      : interaction.type === "mode"
        ? () => setMode(interaction.mode)
        : interaction.type === "children"
          ? () => setChildrenOptions(interaction)
          : undefined;

  return (
    <Spotlight.Action
      renderRoot={renderRoot}
      onClick={onClick}
      closeSpotlightOnTrigger={interaction.type !== "mode" && interaction.type !== "children"}
      className={classes.spotlightAction}
    >
      <group.component {...option} />
    </Spotlight.Action>
  );
};
