"use client";

import { Button, Card, Stack, TextInput } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

export const InitGroup = () => {
  return (
    <Card w={64 * 6} maw="90vw">
      <Stack>
        <TextInput label="Group name" description="Name has to match admin group of external provider" required />
        <Button rightSection={<IconArrowRight size={16} stroke={1.5} />}>Continue</Button>
      </Stack>
    </Card>
  );
};
