"use client";

import { useState } from "react";

import { clientApi } from "@homarr/api/client";
import { Stack, Text } from "@homarr/ui";

export const Test = () => {
  const [value, setValue] = useState<number>(0);
  clientApi.user.test.useSubscription(undefined, {
    onData(data) {
      setValue(data);
    },
    onError(err) {
      alert(err);
    },
  });
  return (
    <Stack>
      <Text>This will change after one second: {value}</Text>
    </Stack>
  );
};
