import type { WidgetComponentProps } from "../definition";

export default function AppWidget({ options: _ }: WidgetComponentProps<"app">) {
  return <pre>APP</pre>;
}
