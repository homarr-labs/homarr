import { Alert, Anchor, Text } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

const FEEDBACK_URL = "https://github.com/homarr-labs/homarr/discussions/categories/custom-widgets";

export function CustomWidgetBetaBanner() {
  return (
    <Alert variant="light" color="yellow" title="Custom Widgets are in Beta" icon={<IconFlask />}>
      <Text size="sm">
        This feature is experimental and will probably change a lot in the future. If you encounter bugs, wish it did
        more, or find something confusing, then please complain to us as much as possible! Only feedback posted on the{" "}
        <Anchor href={FEEDBACK_URL} target="_blank" fw={600}>
          official discussion thread
        </Anchor>{" "}
        will be taken into account. Happy Hacking!
      </Text>
    </Alert>
  );
}
