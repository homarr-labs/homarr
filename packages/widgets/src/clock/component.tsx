import type { WidgetComponentProps } from "../definition";

export default function ClockWidget({
  options,
  integrations: _,
}: WidgetComponentProps<"clock">) {
  return <pre>{JSON.stringify(options)}</pre>;
}
