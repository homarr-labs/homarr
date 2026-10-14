import { Alert, Button, Stack, Text } from "@mantine/core";
import { ORPCError } from "@orpc/client";

export function BoardError({ error, retry }: { error: unknown; retry?: () => void }) {
  const code = error instanceof ORPCError ? error.code : undefined;
  const message = error instanceof Error ? error.message : "The board request failed.";
  const title =
    code === "PRECONDITION_FAILED"
      ? "Board operation unavailable"
      : code === "FORBIDDEN"
        ? "Board access denied"
        : code === "UNAUTHORIZED"
          ? "Sign in to continue"
          : code === "NOT_FOUND"
            ? "Board not found"
            : "Could not update board";
  return (
    <Alert color="red" title={title} role="alert">
      <Stack gap="xs">
        <Text size="sm" style={{ overflowWrap: "anywhere" }}>
          {message}
        </Text>
        {code && <Text size="xs">{code}</Text>}
        {retry && (
          <Button variant="default" size="xs" onClick={retry}>
            Retry request
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
