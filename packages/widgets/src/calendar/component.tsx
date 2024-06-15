import { Stack } from "@mantine/core";
import type { WidgetComponentProps } from "../definition";

export default function CalendarWidget({ serverData }: WidgetComponentProps<"calendar">) {
    return <Stack><span>TEST!!!</span><span>{JSON.stringify(serverData)}</span></Stack>
}
