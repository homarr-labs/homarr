import { db } from "@alparr/db";
import { Button, Stack, Title } from "@mantine/core";

export default async function HomePage() {
  const users = await db.query.users.findMany();

  return (
    <Stack>
      <Title>Home</Title>
      <Button>Test</Button>
      <pre>{JSON.stringify(users)}</pre>
    </Stack>
  );
}
