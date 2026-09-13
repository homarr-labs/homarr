import { isInterpreterCallback } from "./interpreter-foundation";

const targetProps = new Set([
  "ref",
  "onClick",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseDown",
  "onMouseUp",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerDown",
  "onPointerUp",
  "onFocus",
  "onBlur",
  "onKeyDown",
  "onKeyUp",
]);

/** The emitter removes authored functions and refs before creating elements. These can only be injected later
 * by trusted target primitives (Popover, Menu, Tooltip) cloning their child. Never restore input change handlers. */
export function trustedTargetProps(props: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([name, value]) => targetProps.has(name) && typeof value === "function" && !isInterpreterCallback(value),
    ),
  );
}
