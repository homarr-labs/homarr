import { Group, Loader, Text } from "@mantine/core";

import classes from "./assistant-panel.module.css";

export const AssistantAutomaticActionProgress = ({ label }: { label: string }) => (
  <Group component="output" className={classes.autoApprovalProgress} gap="sm" wrap="nowrap">
    <Loader type="bars" size="sm" color="green" />
    <Text size="sm" fw={600}>
      {label}
    </Text>
  </Group>
);
