"use client";

import { useState } from "react";

import { clientApi } from "@homarr/api/client";
import { Button, Stack, Text, TextInput } from "@homarr/ui";

export const Test = () => {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string>("Hello, world!");
  const {mutate} = clientApi.user.setMessage.useMutation();
  clientApi.user.test.useSubscription(undefined, {
    onData({message}) {
      setMessage(message);
    },
    onError(err) {
      alert(err);
    },
  });
  return (
    <Stack>
      <TextInput label="Update message" value={value} onChange={e => setValue(e.target.value)} />
      <Button onClick={() => {
        mutate(value);
        setValue("");
      }}>Update message</Button>
      <Text>This message gets through subscription: {message}</Text>
    </Stack>
  );
};
