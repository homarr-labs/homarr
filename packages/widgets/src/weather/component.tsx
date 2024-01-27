import type { WidgetComponentProps } from "../definition";

export default function WeatherWidget({
  options,
}: WidgetComponentProps<"weather">) {
  return <pre>WEATHER: {JSON.stringify(options)}</pre>;
}
