import { Stack } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";

export default function ClockWidget({
  options,
  integrations,
}: WidgetComponentProps<"clock">) {
  return (
    <Stack>
      <pre>{JSON.stringify(integrations)}</pre>
      <pre>{JSON.stringify(options)}</pre>
    </Stack>
  );
}
