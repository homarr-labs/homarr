import { useId, useState } from "react";
import { Anchor, Code, Collapse, Stack, Text } from "@mantine/core";

import type { AuthUiMessages } from "./contracts";

export function AuthPasswordRecovery({ username, messages }: { username: string; messages: AuthUiMessages }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const commandUsername = username.trim().length > 0 ? username.trim() : "<username>";

  return (
    <>
      <Anchor
        component="button"
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
      >
        {messages.forgotPassword}
      </Anchor>
      <Collapse expanded={expanded} id={id}>
        <Stack gap="xs">
          <Text size="sm">{messages.resetPasswordDescription}</Text>
          <Code style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            homarr reset-password -u {commandUsername}
          </Code>
        </Stack>
      </Collapse>
    </>
  );
}
