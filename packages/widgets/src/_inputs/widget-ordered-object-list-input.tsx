import {Button, Card, Stack, Text} from "@mantine/core";
import type {CommonWidgetInputProps} from "./common";
import {useFormContext} from "./form";
import React from "react";

export const WidgetOrderedObjectListInput = ({
                                               property,
                                               options,
                                             }: CommonWidgetInputProps<"orderedObjectList">) => {
  const form = useFormContext();

  const values = form.values.options[property] as Record<string, unknown>[];

  const add = () => {
    form.setFieldValue('options', [...form.values.options, {
      name: ''
    }]);
  }

  return (
    <Card>
      {values.map((value, index) => {
        return <options.itemComponent key={index} item={value}/>;
      })}
      {values.length === 0 && (
        <Stack align={"center"} mb={"xl"}>
          <Text c={"dimmed"}>Not configured any items</Text>
        </Stack>
      )}
      <Button onClick={add}>Add item</Button>
    </Card>
  );
};
