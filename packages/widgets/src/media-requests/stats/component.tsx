import type { WidgetComponentProps } from "../../definition";

export default function MediaServerWidget({ serverData }: WidgetComponentProps<"mediaRequests-requestStats">) {
  return <span>{JSON.stringify(serverData)}</span>
}