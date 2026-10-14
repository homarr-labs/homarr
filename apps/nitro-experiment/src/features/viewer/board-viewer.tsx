import { Anchor, Badge, Container, Divider, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { boardSlots } from "../../app/slots";
import type { BoardViewerProps } from "../../contracts/ui";
import { useSessionTransition } from "../session/session-transition";

export function BoardViewer({ snapshot, client, queryClient, onCommitted, onSessionChanged }: BoardViewerProps) {
  const accessPending = useSessionTransition(queryClient);
  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="xl">
        <header>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap="xs" style={{ minWidth: 0 }}>
                <Text size="sm" fw={600}>
                  Homarr · Nitro fixture
                </Text>
                <Title order={1} style={{ overflowWrap: "anywhere", textWrap: "balance" }}>
                  {accessPending ? "Board access" : snapshot.board.content.label}
                </Title>
                {!accessPending && (
                  <Group gap="xs">
                    <Badge variant="light" color={snapshot.board.visibility === "private" ? "grape" : "blue"}>
                      {snapshot.board.visibility === "private" ? "Private fixture" : "Public fixture"}
                    </Badge>
                    <Text size="sm">
                      Revision {snapshot.board.revision} · {snapshot.board.content.columns} columns
                    </Text>
                  </Group>
                )}
              </Stack>
              <Group component="nav" aria-label="Fixture boards" gap="md">
                <Link
                  to="/boards/$boardId"
                  params={{ boardId: "public" }}
                  aria-current={snapshot.board.id === "public" ? "page" : undefined}
                >
                  <Anchor component="span">Public board</Anchor>
                </Link>
                <Link
                  to="/boards/$boardId"
                  params={{ boardId: "private" }}
                  aria-current={snapshot.board.id === "private" ? "page" : undefined}
                >
                  <Anchor component="span">Private board</Anchor>
                </Link>
              </Group>
            </Group>
            <Text size="sm">Disposable synthetic data. Fixture authentication is not production authentication.</Text>
            <boardSlots.Session client={client} queryClient={queryClient} onSessionChanged={onSessionChanged} />
          </Stack>
        </header>
        <Divider />
        {accessPending ? (
          <section aria-label="Access reconciliation" role="status">
            <Text>
              Board content is hidden until access is confirmed. Use the fixture controls above to refresh access or
              choose an identity.
            </Text>
          </section>
        ) : (
          <section aria-label="Board widgets" data-columns={snapshot.board.content.columns}>
            <SimpleGrid
              cols={{ base: 1, sm: Math.min(snapshot.board.content.columns, 2), md: snapshot.board.content.columns }}
              spacing="lg"
            >
              <Paper withBorder radius="md" p="lg" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <boardSlots.Widget
                  board={snapshot.board}
                  snapshot={snapshot.widget}
                  client={client}
                  queryClient={queryClient}
                />
              </Paper>
            </SimpleGrid>
          </section>
        )}
        {!accessPending && snapshot.board.capabilities.canEdit && (
          <section aria-label="Board editing">
            <boardSlots.Editor
              board={snapshot.board}
              client={client}
              queryClient={queryClient}
              onCommitted={onCommitted}
            />
          </section>
        )}
      </Stack>
    </Container>
  );
}
