import type { TablerIconsProps } from "@homarr/ui";

interface BaseSpotlightAction {
  id: string;
  title: string;
  description: string;
  group: string;
  icon: ((props: TablerIconsProps) => JSX.Element) | string;
}

interface SpotlightActionLink extends BaseSpotlightAction {
  type: "link";
  href: string;
}

interface SpotlightActionButton extends BaseSpotlightAction {
  type: "button";
  onClick: () => void;
}

export type SpotlightActionProps = SpotlightActionLink | SpotlightActionButton;
