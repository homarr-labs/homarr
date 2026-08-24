import { Spotlight } from "@mantine/spotlight";

import { getSafeAppHref, SAFE_NEW_TAB_REL } from "@homarr/common";
import { Link } from "@homarr/ui";

import type { SearchGroup } from "../../../lib/group";
import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import type { SpotlightMode } from "../../../open";
import { selectAction, spotlightStore } from "../../../spotlight-store";
import classes from "./action-item.module.css";

interface SpotlightGroupActionItemProps<TOption extends Record<string, unknown>> {
  option: TOption;
  query: string;
  setQuery: (query: string) => void;
  setMode: (mode: SpotlightMode) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
  group: SearchGroup<TOption>;
}

export const SpotlightGroupActionItem = <TOption extends Record<string, unknown>>({
  group,
  query,
  setQuery,
  setMode,
  setChildrenOptions,
  option,
}: SpotlightGroupActionItemProps<TOption>) => {
  const interaction = group.useInteraction(option, query);
  const unavailable = "unavailable" in option && option.unavailable === true;
  // Avoid passing React's special `key` prop via spread

  const { key: _reactKey, ...optionProps } = option as unknown as { key?: unknown } & Record<string, unknown>;

  const safeHref = interaction.type === "link" ? getSafeAppHref(interaction.href) : undefined;
  const renderRoot =
    interaction.type === "link" && safeHref && !unavailable
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

  const handleClickAsync = async () => {
    if (unavailable) return;

    if (interaction.type === "javaScript") {
      await interaction.onSelect();
    } else if (interaction.type === "setQuery") {
      setQuery(interaction.query);
      setTimeout(() => selectAction(0, spotlightStore));
    } else if (interaction.type === "mode") {
      if (interaction.query !== undefined) {
        setQuery(interaction.query);
      }
      setMode(interaction.mode);
    } else if (interaction.type === "children") {
      setChildrenOptions(interaction);
    }
  };

  return (
    <Spotlight.Action
      renderRoot={renderRoot}
      onClick={handleClickAsync}
      closeSpotlightOnTrigger={
        interaction.type !== "mode" &&
        interaction.type !== "children" &&
        interaction.type !== "none" &&
        interaction.type !== "setQuery" &&
        (interaction.type !== "javaScript" || interaction.closeSpotlightOnTrigger !== false)
      }
      className={classes.spotlightAction}
      aria-disabled={unavailable || undefined}
      disabled={unavailable}
    >
      <group.Component {...(optionProps as TOption)} />
    </Spotlight.Action>
  );
};
