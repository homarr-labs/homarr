import { Spotlight } from "@mantine/spotlight";

import type { TranslationObject } from "@homarr/translation";
import { Link } from "@homarr/ui";

import type { SearchGroup } from "../../../lib/group";
import type { inferSearchInteractionOptions } from "../../../lib/interaction";
import { selectAction, spotlightStore } from "../../../spotlight-store";
import classes from "./action-item.module.css";

interface SpotlightGroupActionItemProps<TOption extends Record<string, unknown>> {
  option: TOption;
  query: string;
  setQuery: (query: string) => void;
  setMode: (mode: keyof TranslationObject["search"]["mode"]) => void;
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
  // Avoid passing React's special `key` prop via spread

  const { key: _reactKey, ...optionProps } = option as unknown as { key?: unknown } & Record<string, unknown>;

  const renderRoot =
    interaction.type === "link"
      ? (props: Record<string, unknown>) => {
          return <Link href={interaction.href} target={interaction.newTab ? "_blank" : undefined} {...props} />;
        }
      : undefined;

  const handleClickAsync = async () => {
    if (interaction.type === "javaScript") {
      await interaction.onSelect();
    } else if (interaction.type === "setQuery") {
      setQuery(interaction.query);
      setTimeout(() => selectAction(0, spotlightStore));
    } else if (interaction.type === "mode") {
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
        interaction.type !== "setQuery"
      }
      className={classes.spotlightAction}
    >
      <group.Component {...(optionProps as TOption)} />
    </Spotlight.Action>
  );
};
