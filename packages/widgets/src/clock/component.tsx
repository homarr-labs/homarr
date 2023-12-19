import type { WidgetComponentProps } from "../definition";

export default function ClockWidget({
  options: _,
}: WidgetComponentProps<"clock">) {
  return <span>CLOCK</span>;
}
