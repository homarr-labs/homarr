import type { WidgetComponentProps } from "../definition";

export default function RssFeed({ serverData }: WidgetComponentProps<"rssFeed">) {
  return <span>{JSON.stringify(serverData)}</span>
}