import type { TranslationFunction } from "@homarr/translation";
import type { TablerIconsProps } from "@homarr/ui";

interface BaseSpotlightAction {
  id: string;
  title: string | ((t: TranslationFunction) => string);
  description: string | ((t: TranslationFunction) => string);
  group: string;
  icon: ((props: TablerIconsProps) => JSX.Element) | string;
  ignoreSearchAndOnlyShowInGroup?: boolean;
}

interface SpotlightActionLink extends BaseSpotlightAction {
  type: "link";
  href: string;
}

interface SpotlightActionButton extends BaseSpotlightAction {
  type: "button";
  onClick: () => void;
}

export type SpotlightActionData = SpotlightActionLink | SpotlightActionButton;
