import { memo } from "react";

import { customJsxTablerIconNames } from "@homarr/custom-widgets/tabler-icons";
import { SpriteIcon } from "@homarr/forms-collection/tabler-icon-picker";

export const SAFE_TABLER_ICON_NAMES = customJsxTablerIconNames;
const supportedIconNames: ReadonlySet<string> = new Set(SAFE_TABLER_ICON_NAMES);

function isValidIconProp(value: unknown): value is string | number {
  return typeof value === "number" || typeof value === "string";
}

export const SafeTablerIcon = memo(function SafeTablerIcon(props: Record<string, unknown>) {
  if (typeof props.name !== "string" || !supportedIconNames.has(props.name)) return null;

  let size: string | number = 24;
  let color = "currentColor";
  let stroke: string | number = 2;
  if (isValidIconProp(props.size)) size = props.size;
  if (typeof props.color === "string") color = props.color;
  if (isValidIconProp(props.stroke)) stroke = props.stroke;

  return (
    <SpriteIcon
      name={props.name}
      size={size}
      color={color}
      stroke={stroke}
      className={`tabler-icon tabler-icon-${props.name}`}
    />
  );
});
