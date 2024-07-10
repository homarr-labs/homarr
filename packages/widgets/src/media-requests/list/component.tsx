import { Stack, Code, Text } from "@mantine/core";
import type { WidgetComponentProps } from "../../definition";

export default function MediaServerWidget({ serverData }: WidgetComponentProps<"mediaRequests-requestList">) {
  return <Stack>
    <Text fw={"bold"}>LIST</Text>
    <Code style={{ textWrap: "wrap", wordWrap: "anywhere" }}
          block>{JSON.stringify(serverData)}
    </Code>
  </Stack>
}