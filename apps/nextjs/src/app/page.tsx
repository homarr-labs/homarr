import { Button, Stack, Title } from "@mantine/core";

import { auth } from "@homarr/auth";
import { db } from "@homarr/db";

export default async function HomePage() {
  const currentSession = await auth();
  const users = await db.query.users.findMany();

  return (
    <Stack>
      <Title>Home</Title>
      <Button>Test</Button>
      <pre>{JSON.stringify(users)}</pre>
      {currentSession && (
        <span>
          Currently logged in as <b>{currentSession.user.name}</b>
        </span>
      )}
    </Stack>
  );
}
