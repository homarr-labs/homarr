import type { WidgetComponentProps } from "../definition";

export default function WeatherWidget({
  options: _,
}: WidgetComponentProps<"weather">) {
  return <span>WEATHER</span>;
}
