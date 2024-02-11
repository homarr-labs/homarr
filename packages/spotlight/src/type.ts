import type {
  TranslationFunction,
  TranslationObject,
} from "@homarr/translation";
import type { TablerIconsProps } from "@homarr/ui";

interface BaseSpotlightAction {
  id: string;
  title: string | ((t: TranslationFunction) => string);
  description: string | ((t: TranslationFunction) => string);
  group: keyof TranslationObject["common"]["search"]["group"];
  icon: ((props: TablerIconsProps) => JSX.Element) | string;
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
