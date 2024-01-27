import type { WidgetComponentProps } from "../definition";

export default function ClockWidget({
  options,
}: WidgetComponentProps<"clock">) {
  return <pre>CLOCK: {JSON.stringify(options)}</pre>;
}
