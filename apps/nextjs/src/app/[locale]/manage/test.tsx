"use client";

import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";
import { Button, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

export const Test = () => {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string>("Hello, world!");
  const { mutate } = clientApi.user.setMessage.useMutation();
  clientApi.user.test.useSubscription(undefined, {
    onData({ message }) {
      setMessage(message);
    },
    onError(err) {
      alert(err);
    },
  });

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    [setValue],
  );
  const onClick = useCallback(() => {
    mutate(value);
    setValue("");
  }, [mutate, value]);

  return (
    <Stack>
      <TextInput label="Update message" value={value} onChange={onChange} />
      <Button onClick={onClick}>Update message</Button>
      <Text>This message gets through subscription: {message}</Text>
    </Stack>
  );
};
