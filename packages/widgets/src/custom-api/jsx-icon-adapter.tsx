import { customJsxTablerIconNames, customJsxTablerIconSpriteBasePath } from "@homarr/custom-widgets/tabler-icons";

export const SAFE_TABLER_ICON_NAMES = customJsxTablerIconNames;
const supportedIconNames: ReadonlySet<string> = new Set(SAFE_TABLER_ICON_NAMES);

function isValidIconProp(value: unknown): value is string | number {
  return typeof value === "number" || typeof value === "string";
}

export function SafeTablerIcon(props: Record<string, unknown>) {
  if (typeof props.name !== "string" || !supportedIconNames.has(props.name)) return null;
  let name = props.name;
  // Preserve Homarr's legacy pulse alias (previously IconHeartbeat) for existing saved widgets.
  if (name === "pulse") name = "heartbeat";

  let sprite = "outline";
  let symbol = `tabler-${name}`;
  if (name.endsWith("-filled")) {
    sprite = "filled";
    symbol = `tabler-filled-${name.slice(0, -"-filled".length)}`;
  }

  let size: string | number = 24;
  let color = "currentColor";
  let stroke: string | number = 2;
  if (isValidIconProp(props.size)) size = props.size;
  if (typeof props.color === "string") color = props.color;
  if (isValidIconProp(props.stroke)) stroke = props.stroke;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      color={color}
      strokeWidth={stroke}
      className={`tabler-icon tabler-icon-${name}`}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`${customJsxTablerIconSpriteBasePath}/${sprite}.svg#${symbol}`} />
    </svg>
  );
}
