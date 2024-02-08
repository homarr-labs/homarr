import type { WidgetComponentProps } from "../definition";

export default function ClockWidget({
  options: _options,
  integrations: _integrations,
  serverData: _serverData,
}: WidgetComponentProps<"clock">) {
  return <div>CLOCK</div>;
}
