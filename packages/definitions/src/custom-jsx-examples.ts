export interface CustomJsxExample {
  id: string;
  title: string;
  description: string;
  template: string;
  requests: readonly Record<string, unknown>[];
}

export const customJsxExamples: readonly CustomJsxExample[] = [
  {
    id: "simple-metric",
    title: "Simple metric",
    description: "A compact status and metric display with no nested requests.",
    template: `<Stack gap="xs" p="sm">
  <Group justify="space-between">
    <Text fw={600}>{data.name}</Text>
    <Badge color={data.status === "online" ? "green" : "red"}>{data.status}</Badge>
  </Group>
  <Title order={2}>{data.value}</Title>
</Stack>`,
    requests: [],
  },
  {
    id: "pokedex-detail",
    title: "Pokédex detail list",
    description: "Paginates the list and fetches details only for visible Pokémon.",
    template: `<Stack gap="sm" p="xs">
  <Title order={3}>Pokédex</Title>
  <PaginatedList pageSize={5}>
    {data.results.map((pokemon) =>
      <Card key={pokemon.name} withBorder p="xs" mb="xs">
        <Text fw={700} tt="capitalize">{pokemon.name}</Text>
        <SubFetch requestId="pokemon-detail" params={{ name: pokemon.name }}>
          {(detail, meta) =>
            <Stack gap={4}>
              <Group gap="xs">
                {detail.types.map((entry) => <Badge key={entry.type.name} color="red">{entry.type.name}</Badge>)}
              </Group>
              <Text size="xs">HP {detail.stats[0].base_stat} · HTTP {meta.status}</Text>
            </Stack>
          }
        </SubFetch>
      </Card>
    )}
  </PaginatedList>
</Stack>`,
    requests: [
      {
        id: "pokemon-detail",
        kind: "query",
        method: "GET",
        pathTemplate: "/api/v2/pokemon/{name}",
        parameters: { name: "string" },
        auth: "none",
        minimumBoardPermission: "view",
        cacheTtlSeconds: 300,
      },
    ],
  },
  {
    id: "stocks-dashboard",
    title: "Stocks dashboard",
    description: "Responsive portfolio values and chart with parent refresh.",
    template: `<Stack gap="md" p="sm">
  <Group justify="space-between">
    <Title order={3}>Portfolio</Title>
    <RefreshButton label="Refresh" size="xs" />
  </Group>
  <SimpleGrid cols={3}>
    {data.holdings.map((stock) =>
      <Card key={stock.symbol} withBorder p="xs">
        <Text fw={700}>{stock.symbol}</Text>
        <NumberFormatter value={stock.price} prefix="$" decimalScale={2} />
        <Sparkline data={stock.history} h={40} color={stock.change > 0 ? "green" : "red"} />
      </Card>
    )}
  </SimpleGrid>
  <LineChart h={200} data={data.timeline} dataKey="date" series={[{ name: "value", color: "blue" }]} />
</Stack>`,
    requests: [],
  },
  {
    id: "navidrome-player",
    title: "Navidrome mini-player",
    description: "Media controls backed by named actions with explicit permissions.",
    template: `<Stack gap="sm" p="sm">
  <Group wrap="nowrap">
    <Image src={data.albumArt} alt={data.album} w={80} h={80} radius="sm" />
    <Stack gap={2} style={{ flex: 1 }}>
      <Text fw={700} lineClamp={1}>{data.title}</Text>
      <Text size="sm" c="dimmed" lineClamp={1}>{data.artist}</Text>
      <Progress value={data.progress} size="xs" color="red" />
    </Stack>
  </Group>
  <Group justify="center" gap="sm">
    <ActionButton requestId="previous" label="Previous" size="xs" variant="subtle" />
    <ActionButton requestId="toggle-playback" label={data.playing ? "Pause" : "Play"} icon="play" color="red" invalidate={["parent"]} />
    <ActionButton requestId="next" label="Next" size="xs" variant="subtle" />
  </Group>
  <ToggleSwitch requestId="shuffle" onParams={{ enabled: true }} offParams={{ enabled: false }} initialValue={data.shuffle} label="Shuffle" size="xs" />
</Stack>`,
    requests: [
      {
        id: "previous",
        kind: "action",
        method: "POST",
        pathTemplate: "/api/player/previous",
        parameters: {},
        auth: "inherit",
        minimumBoardPermission: "modify",
      },
      {
        id: "toggle-playback",
        kind: "action",
        method: "POST",
        pathTemplate: "/api/player/toggle",
        parameters: {},
        auth: "inherit",
        minimumBoardPermission: "modify",
      },
      {
        id: "next",
        kind: "action",
        method: "POST",
        pathTemplate: "/api/player/next",
        parameters: {},
        auth: "inherit",
        minimumBoardPermission: "modify",
      },
      {
        id: "shuffle",
        kind: "action",
        method: "PUT",
        pathTemplate: "/api/player/shuffle",
        parameters: { enabled: "boolean" },
        bodyTemplate: { enabled: { $param: "enabled" } },
        auth: "inherit",
        minimumBoardPermission: "modify",
      },
    ],
  },
  {
    id: "pokedex-interactive",
    title: "Interactive Pokédex",
    description:
      "A full-featured Pokédex with paginated list, detail SubFetch, type badges, stats with progress bars, moves grid, and evolution chain. Exercises filter(Boolean), pop(), find, reduce, sort, replaceAll, padStart, arithmetic, and nested SubFetch.",
    template: `<Stack gap="sm" p="sm" style={{ minWidth: 0 }}>
  <Group justify="space-between" wrap="nowrap">
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon size="lg" radius="xl" variant="light" color="red">P</ThemeIcon>
      <Box>
        <Title order={3}>Pokédex</Title>
        <Text size="xs" c="dimmed"><NumberFormatter value={data.count} thousandSeparator /> Pokémon discovered</Text>
      </Box>
    </Group>
    <RefreshButton label="Refresh" size="xs" />
  </Group>

  <PaginatedList pageSize={5}>
    {data.results.map((pokemon, index) =>
      <Accordion key={pokemon.name} variant="separated" radius="md">
        <Accordion.Item value={pokemon.name}>
          <Accordion.Control>
            <Group justify="space-between" wrap="nowrap" pr="xs">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Avatar size="sm" radius="md" src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + (index + 1) + ".png"} />
                <Box style={{ minWidth: 0 }}>
                  <Text size="xs" c="dimmed">#{String(index + 1).padStart(4, "0")}</Text>
                  <Text fw={700} tt="capitalize" lineClamp={1}>{pokemon.name.replaceAll("-", " ")}</Text>
                </Box>
              </Group>
              <Badge size="xs" variant="outline">Details</Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <SubFetch requestId="pokemon-detail" params={{ name: pokemon.name }}>
              {(detail, meta) =>
                <Stack gap="sm">
                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 5 }}>
                      <Center>
                        <Image src={detail.sprites.front_default} alt={detail.name} fit="contain" h={120} />
                      </Center>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 7 }}>
                      <Stack gap="xs">
                        <Group gap="xs">
                          {detail.types.map((entry) =>
                            <Badge key={entry.type.name} tt="capitalize">{entry.type.name}</Badge>
                          )}
                        </Group>
                        <SimpleGrid cols={3} spacing="xs">
                          <Box><Text size="xs" c="dimmed">Height</Text><Text fw={700}><NumberFormatter value={detail.height / 10} decimalScale={1} suffix=" m" /></Text></Box>
                          <Box><Text size="xs" c="dimmed">Weight</Text><Text fw={700}><NumberFormatter value={detail.weight / 10} decimalScale={1} suffix=" kg" /></Text></Box>
                          <Box><Text size="xs" c="dimmed">Base XP</Text><Text fw={700}>{detail.base_experience || "—"}</Text></Box>
                        </SimpleGrid>
                        <Group gap="xs">
                          {detail.abilities.map((entry) =>
                            <Badge key={entry.ability.name} variant="light" size="xs" tt="capitalize">
                              {entry.ability.name.replaceAll("-", " ")}{entry.is_hidden ? " ·H" : ""}
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  <Tabs defaultValue="stats" variant="outline" radius="md">
                    <Tabs.List>
                      <Tabs.Tab value="stats">Stats</Tabs.Tab>
                      <Tabs.Tab value="moves">Moves</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="stats" pt="sm">
                      <Stack gap="xs">
                        {detail.stats.map((entry) =>
                          <Box key={entry.stat.name}>
                            <Group justify="space-between" mb={2}>
                              <Text size="xs" tt="capitalize">{entry.stat.name.replaceAll("-", " ")}</Text>
                              <Text size="xs" fw={700}>{entry.base_stat}</Text>
                            </Group>
                            <Progress value={Math.min(100, entry.base_stat / 2.55)} size="sm" radius="xl" />
                          </Box>
                        )}
                        <Group justify="space-between">
                          <Text size="sm" fw={700}>Total</Text>
                          <Badge>{detail.stats.reduce((sum, s) => sum + s.base_stat, 0)}</Badge>
                        </Group>
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="moves" pt="sm">
                      <ScrollArea h={120} type="auto">
                        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                          {detail.moves.slice(0, 30).map((entry) =>
                            <Badge key={entry.move.name} variant="light" size="xs" tt="capitalize" style={{ whiteSpace: "normal" }}>
                              {entry.move.name.replaceAll("-", " ")}
                            </Badge>
                          )}
                        </SimpleGrid>
                      </ScrollArea>
                    </Tabs.Panel>
                  </Tabs>

                  <Text size="xs" c="dimmed">Status: {meta.status}</Text>
                </Stack>
              }
            </SubFetch>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    )}
  </PaginatedList>
</Stack>`,
    requests: [
      {
        id: "pokemon-detail",
        kind: "query",
        method: "GET",
        pathTemplate: "/api/v2/pokemon/{name}",
        parameters: { name: "string" },
        auth: "none",
        minimumBoardPermission: "view",
        cacheTtlSeconds: 3600,
      },
    ],
  },
  {
    id: "smart-home-control",
    title: "Smart-home control",
    description: "A stateful light control with an explicit destructive confirmation.",
    template: `<Stack gap="md" p="sm">
  <Group justify="space-between">
    <Title order={4}>Living room</Title>
    <Badge color={data.state === "on" ? "yellow" : "gray"}>{data.state}</Badge>
  </Group>
  <ToggleSwitch requestId="set-light" onParams={{ state: "on" }} offParams={{ state: "off" }} initialValue={data.state === "on"} label="Power" color="yellow" />
  <ActionButton requestId="delete-scene" label="Delete scene" color="red" icon="trash" confirmMessage="Delete this scene?" />
</Stack>`,
    requests: [
      {
        id: "set-light",
        kind: "action",
        method: "PUT",
        pathTemplate: "/api/lights/living-room",
        parameters: { state: "string" },
        bodyTemplate: { state: { $param: "state" } },
        auth: "inherit",
        minimumBoardPermission: "modify",
      },
      {
        id: "delete-scene",
        kind: "action",
        method: "DELETE",
        pathTemplate: "/api/scenes/living-room",
        parameters: {},
        auth: "inherit",
        minimumBoardPermission: "full",
      },
    ],
  },
];
