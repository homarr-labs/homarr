import { customJsxTablerIconSpriteBasePath, getTablerSpriteSymbol } from "@homarr/custom-widgets/tabler-icons";

// The same sprite custom widgets use (prepared by apps/nextjs/scripts/prepare-tabler-icons.mjs). Drawing icons from
// it keeps bundles free of the icon set: only a name is stored.
export const spriteBasePath = customJsxTablerIconSpriteBasePath;

interface SpriteIconProps {
  name: string;
  size: number | string;
  stroke?: number | string;
  color?: string;
  className?: string;
}

/** A Tabler icon by name, e.g. "bolt" or "star-filled"; legacy names resolve like they do in custom widgets. */
export function SpriteIcon({ name, size, stroke = 1.8, className, color }: SpriteIconProps) {
  const { sprite, symbol } = getTablerSpriteSymbol(name);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      color={color}
      strokeWidth={stroke}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${spriteBasePath}/${sprite}.svg#${symbol}`} />
    </svg>
  );
}
