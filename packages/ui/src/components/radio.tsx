import type { RadioCardProps } from "@mantine/core";
import { Group, RadioCard, RadioIndicator, Text } from "@mantine/core";
import clsx from "clsx";

import classes from "./radio.module.css";

interface CustomRadioCardProps extends RadioCardProps {
  label: string;
  description: string;
}

export const CustomRadioCard = (props: CustomRadioCardProps) => {
  return (
    <RadioCard className={clsx(classes.root, props.className)} {...props}>
      <Group wrap="nowrap" align="flex-start">
        <RadioIndicator />
        <div>
          <Text className={classes.label}>{props.label}</Text>
          <Text className={classes.description}>{props.description}</Text>
        </div>
      </Group>
    </RadioCard>
  );
};
