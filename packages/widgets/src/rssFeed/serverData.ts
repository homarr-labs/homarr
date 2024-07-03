import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"rssFeed">) {
  return {
    initialData: []
  }
}