import type {
  TranslationFunction,
  TranslationObject,
} from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

export type SpotlightActionGroup =
  keyof TranslationObject["common"]["search"]["group"];

interface BaseSpotlightAction {
  id: string;
  title: string | ((t: TranslationFunction) => string);
  description: string | ((t: TranslationFunction) => string);
  group: Exclude<SpotlightActionGroup, "all">; // actions can not be assigned to the "all" group
  icon: TablerIcon | string;
  ignoreSearchAndOnlyShowInGroup?: boolean;
}

interface SpotlightActionLink extends BaseSpotlightAction {
  type: "link";
  href: string;
}

type MaybePromise<T> = T | Promise<T>;

interface SpotlightActionButton extends BaseSpotlightAction {
  type: "button";
  onClick: () => MaybePromise<void>;
}

export type SpotlightActionData = SpotlightActionLink | SpotlightActionButton;
