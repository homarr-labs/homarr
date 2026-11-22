import tablerPackage from "@tabler/icons-react/package.json";

// The same sprite custom widgets use (prepared by apps/nextjs/scripts/prepare-tabler-icons.mjs). Drawing icons from
// it keeps bundles free of the icon set: only a name is stored.
export const spriteBasePath = `/tabler-icons/${tablerPackage.version}`;
const FILLED_SUFFIX = "-filled";

interface SpriteIconProps {
  name: string;
  size: number | string;
  stroke?: number;
  className?: string;
}

/** A Tabler icon by name, e.g. "bolt" or "star-filled". */
export function SpriteIcon({ name, size, stroke = 1.8, className }: SpriteIconProps) {
  const filled = name.endsWith(FILLED_SUFFIX);
  const sprite = filled ? "filled" : "outline";
  const symbol = filled ? `tabler-filled-${name.slice(0, -FILLED_SUFFIX.length)}` : `tabler-${name}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={stroke}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${spriteBasePath}/${sprite}.svg#${symbol}`} />
    </svg>
  );
}
